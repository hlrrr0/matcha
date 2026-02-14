"""MATCHA Indeed 掲載チェッカー — Flask エントリーポイント

Cloud Scheduler から毎週月曜 3:00 AM (JST) にトリガーされる。
手動実行も /run エンドポイントで可能。
"""

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone

from flask import Flask, jsonify, request

from firestore_service import (
    get_all_companies,
    has_agent_exported_jobs,
    update_company_indeed_status,
    update_jobs_indeed_control,
)
from indeed_checker import check_company_indeed

# ログ設定（Cloud Run 向け構造化ログ）
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

app = Flask(__name__)


@app.route('/health', methods=['GET'])
def health():
    """ヘルスチェック用エンドポイント。"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()})


@app.route('/run', methods=['POST'])
def run_checker():
    """Indeed 掲載チェックを実行するメインエンドポイント。

    Cloud Scheduler または手動で呼び出される。
    全アクティブ企業に対して Indeed 掲載チェックを行い、
    結果を Firestore に書き込む。
    """
    start_time = time.time()
    logger.info('=== Indeed 掲載チェック開始 ===')

    # 実行結果サマリー
    summary = {
        'total': 0,
        'checked': 0,
        'detected': 0,
        'not_detected': 0,
        'errors': 0,
        'jobs_updated': 0,
        'details': [],
    }

    try:
        # 1. 全アクティブ企業を取得
        companies = get_all_companies()
        summary['total'] = len(companies)
        logger.info(f'チェック対象企業数: {len(companies)}')

        # 2. 各企業をチェック
        for i, company in enumerate(companies, 1):
            company_id = company.get('id', '')
            company_name = company.get('name', '不明')

            logger.info(
                f'[{i}/{len(companies)}] チェック中: '
                f'{company_name} (ID: {company_id})'
            )

            # Indeed チェック実行
            result = check_company_indeed(company)

            detail = {
                'companyId': company_id,
                'companyName': company_name,
                'result': result.to_dict(),
            }

            if result.error:
                # エラーの場合は前回の状態を維持し、エラーだけ記録
                summary['errors'] += 1
                try:
                    update_company_indeed_status(
                        company_id=company_id,
                        detected=company.get('indeedStatus', {}).get('detected', False),
                        detected_by=company.get('indeedStatus', {}).get('detectedBy'),
                        indeed_url=company.get('indeedStatus', {}).get('indeedUrl'),
                        error=result.error,
                    )
                except Exception as e:
                    logger.error(f'Firestore更新エラー ({company_id}): {e}')
            else:
                summary['checked'] += 1

                # detectedBy を判定
                detected_by = None
                if result.detected:
                    summary['detected'] += 1
                    # Agent経由のエクスポート済み求人があるか確認
                    if has_agent_exported_jobs(company_id):
                        detected_by = 'agent'
                    else:
                        detected_by = 'external'
                    detail['detectedBy'] = detected_by
                else:
                    summary['not_detected'] += 1

                # Firestore 更新: 企業
                try:
                    update_company_indeed_status(
                        company_id=company_id,
                        detected=result.detected,
                        detected_by=detected_by,
                        indeed_url=result.indeed_url,
                    )
                except Exception as e:
                    logger.error(f'企業ステータス更新エラー ({company_id}): {e}')
                    summary['errors'] += 1

                # Firestore 更新: 求人（can_post は detected の逆）
                can_post = not result.detected
                try:
                    updated_count = update_jobs_indeed_control(
                        company_id, can_post
                    )
                    summary['jobs_updated'] += updated_count
                    detail['jobsUpdated'] = updated_count
                except Exception as e:
                    logger.error(f'求人ステータス更新エラー ({company_id}): {e}')
                    summary['errors'] += 1

            summary['details'].append(detail)

        elapsed = time.time() - start_time
        summary['elapsed_seconds'] = round(elapsed, 1)

        logger.info('=== Indeed 掲載チェック完了 ===')
        logger.info(json.dumps({
            'total': summary['total'],
            'checked': summary['checked'],
            'detected': summary['detected'],
            'not_detected': summary['not_detected'],
            'errors': summary['errors'],
            'jobs_updated': summary['jobs_updated'],
            'elapsed_seconds': summary['elapsed_seconds'],
        }, ensure_ascii=False))

        return jsonify(summary), 200

    except Exception as e:
        logger.error(f'致命的エラー: {e}', exc_info=True)
        return jsonify({
            'error': str(e),
            'summary': summary,
        }), 500


@app.route('/check-single', methods=['POST'])
def check_single():
    """1社だけチェックしてFirestoreも更新するエンドポイント。

    Request Body:
        { "companyId": "xxx", "companyName": "企業名" }
    """
    data = request.get_json(silent=True) or {}
    company_name = data.get('companyName', '')
    company_id = data.get('companyId', '')

    if not company_name:
        return jsonify({'error': 'companyName は必須です'}), 400

    company = {'id': company_id, 'name': company_name}
    result = check_company_indeed(company)

    # Firestore に結果を書き込む
    if company_id and not result.error:
        try:
            detected_by = None
            if result.detected:
                if has_agent_exported_jobs(company_id):
                    detected_by = 'agent'
                else:
                    detected_by = 'external'

            update_company_indeed_status(
                company_id=company_id,
                detected=result.detected,
                detected_by=detected_by,
                indeed_url=result.indeed_url,
            )

            can_post = not result.detected
            updated_count = update_jobs_indeed_control(company_id, can_post)
            logger.info(f'単体チェック Firestore更新完了: {company_name} (求人{updated_count}件)')
        except Exception as e:
            logger.error(f'単体チェック Firestore更新エラー ({company_id}): {e}')
    elif company_id and result.error:
        try:
            update_company_indeed_status(
                company_id=company_id,
                detected=False,
                detected_by=None,
                error=result.error,
            )
        except Exception as e:
            logger.error(f'単体チェック エラー記録失敗 ({company_id}): {e}')

    return jsonify({
        'companyId': company_id,
        'companyName': company_name,
        'result': result.to_dict(),
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
