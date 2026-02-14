"""Firestore サービスモジュール

Companies / Jobs コレクションの読み書きを担当する。
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from google.cloud import firestore

logger = logging.getLogger(__name__)

_db = None


def get_db() -> firestore.Client:
    """Firestore クライアントのシングルトンを返す。"""
    global _db
    if _db is None:
        _db = firestore.Client()
    return _db


def get_all_companies() -> List[dict]:
    """全アクティブ企業を取得する。

    Returns:
        企業データのリスト（id 付き）
    """
    db = get_db()
    docs = db.collection('companies').where('status', '==', 'active').stream()

    companies = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        companies.append(data)

    logger.info(f'取得した企業数: {len(companies)}')
    return companies


def update_company_indeed_status(
    company_id: str,
    detected: bool,
    detected_by: Optional[str],
    indeed_url: Optional[str] = None,
    error: Optional[str] = None,
) -> None:
    """企業の indeedStatus を更新する。

    Args:
        company_id: 企業ドキュメントID
        detected: Indeed掲載が検出されたか
        detected_by: 'agent' / 'external' / None
        indeed_url: 検出されたIndeed URL
        error: エラーがあった場合の詳細
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    update_data = {
        'indeedStatus.detected': detected,
        'indeedStatus.detectedBy': detected_by,
        'indeedStatus.lastCheckedAt': now,
        'updatedAt': now,
    }

    if indeed_url:
        update_data['indeedStatus.indeedUrl'] = indeed_url

    if error:
        update_data['indeedStatus.error'] = error
    else:
        # エラーがなければクリア
        update_data['indeedStatus.error'] = firestore.DELETE_FIELD

    db.collection('companies').document(company_id).update(update_data)
    logger.info(
        f'企業 {company_id} のIndeedステータスを更新: '
        f'detected={detected}, detectedBy={detected_by}'
    )


def get_jobs_for_company(company_id: str) -> List[dict]:
    """企業に紐づく全求人を取得する。

    Args:
        company_id: 企業ドキュメントID

    Returns:
        求人データのリスト
    """
    db = get_db()
    docs = (
        db.collection('jobs')
        .where('companyId', '==', company_id)
        .stream()
    )

    jobs = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        jobs.append(data)

    return jobs


def has_agent_exported_jobs(company_id: str) -> bool:
    """企業にAgent経由でエクスポートされた求人があるか確認する。

    Args:
        company_id: 企業ドキュメントID

    Returns:
        1件以上あれば True
    """
    db = get_db()
    docs = (
        db.collection('jobs')
        .where('companyId', '==', company_id)
        .where('indeedControl.exported', '==', True)
        .limit(1)
        .stream()
    )

    return any(True for _ in docs)


def update_jobs_indeed_control(company_id: str, can_post: bool) -> int:
    """企業に紐づく全求人の indeedControl.canPost を更新する。

    Args:
        company_id: 企業ドキュメントID
        can_post: Indeed出稿可能か

    Returns:
        更新した求人数
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    jobs = get_jobs_for_company(company_id)
    updated = 0

    for job in jobs:
        job_ref = db.collection('jobs').document(job['id'])

        # indeedControl が存在しない場合は新規作成
        current = job.get('indeedControl', {})

        update_data = {
            'indeedControl.canPost': can_post,
            'updatedAt': now,
        }

        # exported フィールドが未設定の場合のみ初期値を設定
        if 'exported' not in current:
            update_data['indeedControl.exported'] = False

        job_ref.update(update_data)
        updated += 1

    logger.info(
        f'企業 {company_id} の求人 {updated}件 の canPost を {can_post} に更新'
    )
    return updated
