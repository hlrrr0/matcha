"""Indeed 掲載チェッカーモジュール

Google Custom Search API を使って企業の Indeed 掲載有無を判定する。
HEAD リクエストで /jobs ページの存在を確認する。
"""

import logging
import os
import random
import time

import requests

from normalization import normalize_company_name

logger = logging.getLogger(__name__)

# Google Custom Search API 設定
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
GOOGLE_CSE_ID = os.environ.get('GOOGLE_CSE_ID', '')

# Indeed 企業ページのベースURL
INDEED_CMP_BASE = 'https://jp.indeed.com/cmp/'

# リクエスト間隔（秒）
MIN_SLEEP = 3
MAX_SLEEP = 5

# HTTP タイムアウト（秒）
REQUEST_TIMEOUT = 15

# User-Agent
USER_AGENT = (
    'Mozilla/5.0 (compatible; MATCHABot/1.0; '
    '+https://github.com/matcha-project)'
)


class IndeedCheckResult:
    """Indeed チェック結果を保持するクラス。"""

    def __init__(
        self,
        detected: bool = False,
        indeed_url: str | None = None,
        has_jobs_page: bool = False,
        error: str | None = None,
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


def search_indeed_company(company_name: str) -> dict | None:
    """Google Custom Search API で Indeed 企業ページを検索する。

    Args:
        company_name: 正規化済み企業名

    Returns:
        検索結果の最初のヒット、またはNone
    """
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        raise ValueError(
            'GOOGLE_API_KEY と GOOGLE_CSE_ID 環境変数が必要です'
        )

    # Indeed 企業ページに絞った検索クエリ
    query = f'site:jp.indeed.com/cmp/ "{company_name}"'

    params = {
        'key': GOOGLE_API_KEY,
        'cx': GOOGLE_CSE_ID,
        'q': query,
        'num': 3,  # 上位3件を取得
    }

    try:
        resp = requests.get(
            'https://www.googleapis.com/customsearch/v1',
            params=params,
            timeout=REQUEST_TIMEOUT,
            headers={'User-Agent': USER_AGENT},
        )
        resp.raise_for_status()
        data = resp.json()

        items = data.get('items', [])
        if not items:
            logger.info(f'"{company_name}" の Indeed ページは見つかりません')
            return None

        # /cmp/ を含むURLのみフィルタ
        for item in items:
            link = item.get('link', '')
            if '/cmp/' in link:
                logger.info(f'"{company_name}" の Indeed ページ発見: {link}')
                return item

        logger.info(
            f'"{company_name}" の検索結果に /cmp/ ページなし'
        )
        return None

    except requests.exceptions.Timeout:
        logger.warning(f'Google Custom Search タイムアウト: {company_name}')
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f'Google Custom Search エラー: {e}')
        raise


def check_jobs_page(cmp_url: str) -> bool:
    """Indeed 企業ページの /jobs サブページが存在するか HEAD リクエストで確認する。

    Args:
        cmp_url: Indeed 企業ページURL (例: https://jp.indeed.com/cmp/CompanyName)

    Returns:
        /jobs ページが存在すれば True
    """
    # URL末尾のスラッシュを正規化
    jobs_url = cmp_url.rstrip('/') + '/jobs'

    try:
        resp = requests.head(
            jobs_url,
            timeout=REQUEST_TIMEOUT,
            headers={'User-Agent': USER_AGENT},
            allow_redirects=True,
        )

        if resp.status_code == 200:
            logger.info(f'/jobs ページ存在: {jobs_url}')
            return True
        else:
            logger.info(
                f'/jobs ページなし (status={resp.status_code}): {jobs_url}'
            )
            return False

    except requests.exceptions.Timeout:
        logger.warning(f'HEAD リクエストタイムアウト: {jobs_url}')
        # タイムアウトは存在しないとは断定しない
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f'HEAD リクエストエラー: {e}')
        raise


def check_company_indeed(company: dict) -> IndeedCheckResult:
    """1社分の Indeed 掲載チェックを実行する。

    処理フロー:
    1. 企業名を正規化
    2. Google Custom Search で Indeed 企業ページを検索
    3. 見つかったら HEAD リクエストで /jobs ページ確認
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
        # 1. Google Custom Search
        search_result = search_indeed_company(normalized)
        _sleep_between_requests()

        if not search_result:
            return IndeedCheckResult(detected=False)

        # Indeed URL を取得
        indeed_url = search_result.get('link', '')

        # 2. /jobs ページの確認
        has_jobs = False
        if indeed_url:
            try:
                has_jobs = check_jobs_page(indeed_url)
                _sleep_between_requests()
            except Exception as e:
                logger.warning(
                    f'/jobs チェック失敗 ({company_id}): {e}'
                )
                # /jobs チェック失敗でも掲載は検出済み

        return IndeedCheckResult(
            detected=True,
            indeed_url=indeed_url,
            has_jobs_page=has_jobs,
        )

    except requests.exceptions.Timeout:
        # タイムアウトは「不明」扱い（falseにしない）
        return IndeedCheckResult(
            error=f'タイムアウト: {company_name}'
        )
    except Exception as e:
        logger.error(f'チェック失敗 ({company_id}): {e}')
        return IndeedCheckResult(
            error=f'チェックエラー: {str(e)}'
        )
