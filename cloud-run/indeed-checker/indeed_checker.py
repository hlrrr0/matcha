"""Indeed 掲載チェッカーモジュール

SerpAPI (Google検索) を使って企業の Indeed 掲載有無を判定する。
1. SerpAPI で「site:jp.indeed.com/cmp/ "企業名"」を検索
2. 見つかった Indeed 企業ページの /jobs サブページを確認
"""

import logging
import os
import random
import re
import time
from typing import Optional

import requests

from normalization import normalize_company_name

logger = logging.getLogger(__name__)

# SerpAPI 設定
SERPAPI_KEY = os.environ.get('SERPAPI_KEY', '')
SERPAPI_URL = 'https://serpapi.com/search.json'

# リクエスト間隔（秒）
MIN_SLEEP = 2
MAX_SLEEP = 4

# HTTP タイムアウト（秒）
REQUEST_TIMEOUT = 20

# User-Agent
USER_AGENT = (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
)


class IndeedCheckResult:
    """Indeed チェック結果を保持するクラス。"""

    def __init__(
        self,
        detected: bool = False,
        indeed_url: Optional[str] = None,
        has_jobs_page: bool = False,
        error: Optional[str] = None,
    ):
        self.detected = detected
        self.indeed_url = indeed_url
        self.has_jobs_page = has_jobs_page
        self.error = error

    def to_dict(self) -> dict:
        return {
            'detected': self.detected,
            'indeedUrl': self.indeed_url,
            'hasJobsPage': self.has_jobs_page,
            'error': self.error,
        }


def _sleep_between_requests():
    """リクエスト間にランダムスリープを入れる。"""
    duration = random.uniform(MIN_SLEEP, MAX_SLEEP)
    logger.debug(f'{duration:.1f}秒スリープ')
    time.sleep(duration)


def search_indeed_company(company_name: str) -> Optional[str]:
    """SerpAPI (Google検索) で Indeed 企業ページを検索する。

    「site:jp.indeed.com/cmp/ "企業名"」で検索し、
    Indeed 企業ページの URL を返す。

    Args:
        company_name: 正規化済み企業名

    Returns:
        Indeed 企業ページURL（見つかった場合）、またはNone
    """
    if not SERPAPI_KEY:
        raise ValueError('SERPAPI_KEY 環境変数が必要です')

    # Indeed 企業ページに絞った検索クエリ
    query = f'site:jp.indeed.com/cmp/ "{company_name}"'

    params = {
        'api_key': SERPAPI_KEY,
        'engine': 'google',
        'q': query,
        'num': 5,
        'gl': 'jp',
        'hl': 'ja',
    }

    try:
        resp = requests.get(
            SERPAPI_URL,
            params=params,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        # エラーチェック
        if 'error' in data:
            logger.error(f'SerpAPI エラー: {data["error"]}')
            raise RuntimeError(f'SerpAPI エラー: {data["error"]}')

        results = data.get('organic_results', [])
        if not results:
            logger.info(f'"{company_name}" の Indeed ページは見つかりません')
            return None

        # /cmp/ を含むURLを探す
        for result in results:
            link = result.get('link', '')
            if '/cmp/' in link:
                # /cmp/企業名 部分のみ抽出（クエリパラメータ除去）
                cmp_match = re.match(
                    r'(https?://jp\.indeed\.com/cmp/[^/?#]+)', link
                )
                if cmp_match:
                    found_url = cmp_match.group(1)
                    logger.info(
                        f'"{company_name}" の Indeed ページ発見: {found_url}'
                    )
                    return found_url

        logger.info(
            f'"{company_name}" の検索結果に /cmp/ ページなし'
        )
        return None

    except requests.exceptions.Timeout:
        logger.warning(f'SerpAPI タイムアウト: {company_name}')
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f'SerpAPI リクエストエラー: {e}')
        raise


def check_jobs_page(cmp_url: str) -> bool:
    """Indeed 企業ページの /jobs サブページが存在するか確認する。

    SerpAPI で「site:企業ページURL/jobs」を検索して確認する。
    直接アクセスは Indeed にブロックされるため、検索結果で判定する。

    Args:
        cmp_url: Indeed 企業ページURL (例: https://jp.indeed.com/cmp/CompanyName)

    Returns:
        /jobs ページが存在すれば True
    """
    if not SERPAPI_KEY:
        return False

    jobs_url = cmp_url.rstrip('/') + '/jobs'
    query = f'site:{jobs_url}'

    params = {
        'api_key': SERPAPI_KEY,
        'engine': 'google',
        'q': query,
        'num': 1,
        'gl': 'jp',
        'hl': 'ja',
    }

    try:
        resp = requests.get(
            SERPAPI_URL,
            params=params,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        results = data.get('organic_results', [])
        if results:
            # /jobs を含む結果があれば存在と判定
            for result in results:
                link = result.get('link', '')
                if '/jobs' in link:
                    logger.info(f'/jobs ページ存在: {jobs_url}')
                    return True

        logger.info(f'/jobs ページなし: {jobs_url}')
        return False

    except Exception as e:
        logger.warning(f'/jobs チェック失敗: {e}')
        # /jobs チェック失敗は False 扱い（掲載検出には影響しない）
        return False


def check_company_indeed(company: dict) -> IndeedCheckResult:
    """1社分の Indeed 掲載チェックを実行する。

    処理フロー:
    1. 企業名を正規化
    2. SerpAPI で Indeed 企業ページを検索
    3. 見つかったら /jobs ページ確認
    4. 結果を返す

    Args:
        company: Firestore の企業ドキュメント

    Returns:
        IndeedCheckResult
    """
    company_name = company.get('name', '')
    company_id = company.get('id', 'unknown')

    if not company_name:
        return IndeedCheckResult(error='企業名が空です')

    # 正規化
    normalized = normalize_company_name(company_name)
    logger.info(
        f'企業 "{company_name}" → 正規化 "{normalized}" (ID: {company_id})'
    )

    try:
        # 1. SerpAPI で Indeed 企業ページを検索
        indeed_url = search_indeed_company(normalized)
        _sleep_between_requests()

        if not indeed_url:
            return IndeedCheckResult(detected=False)

        # 2. /jobs ページの確認（SerpAPIの追加クエリ消費を避けるため、
        #    バッチ実行時はスキップ可能）
        has_jobs = False
        try:
            has_jobs = check_jobs_page(indeed_url)
            _sleep_between_requests()
        except Exception as e:
            logger.warning(
                f'/jobs チェック失敗 ({company_id}): {e}'
            )

        return IndeedCheckResult(
            detected=True,
            indeed_url=indeed_url,
            has_jobs_page=has_jobs,
        )

    except requests.exceptions.Timeout:
        return IndeedCheckResult(
            error=f'タイムアウト: {company_name}'
        )
    except Exception as e:
        logger.error(f'チェック失敗 ({company_id}): {e}')
        return IndeedCheckResult(
            error=f'チェックエラー: {str(e)}'
        )
