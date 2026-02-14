"""企業名正規化モジュール

Indeed検索用に企業名から不要な文字列を除去・変換する。
"""

import re
import unicodedata


# 除去対象の法人格
CORPORATE_SUFFIXES = [
    '株式会社',
    '有限会社',
    '合同会社',
    '合資会社',
    '合名会社',
    '一般社団法人',
    '一般財団法人',
    '特定非営利活動法人',
    'NPO法人',
    '㈱',
    '（株）',
    '(株)',
    '㈲',
    '（有）',
    '(有)',
    '（合）',
    '(合)',
]


def normalize_company_name(name: str) -> str:
    """企業名を正規化する。

    1. 法人格を除去
    2. 全角英数字・記号を半角に変換
    3. 余分な空白を除去
    4. trim処理

    Args:
        name: 元の企業名

    Returns:
        正規化された企業名
    """
    if not name:
        return ''

    result = name

    # 法人格を除去
    for suffix in CORPORATE_SUFFIXES:
        result = result.replace(suffix, '')

    # 全角英数字を半角に変換（NFKC正規化）
    result = unicodedata.normalize('NFKC', result)

    # 余分な空白を除去
    result = re.sub(r'\s+', ' ', result)

    # trim
    result = result.strip()

    return result
