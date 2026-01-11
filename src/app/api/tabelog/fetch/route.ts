import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: '食べログURLが指定されていません' },
        { status: 400 }
      )
    }

    // 食べログのURLかチェック
    if (!url.includes('tabelog.com')) {
      return NextResponse.json(
        { error: '有効な食べログURLを入力してください' },
        { status: 400 }
      )
    }

    // 食べログのページを取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: '食べログページの取得に失敗しました' },
        { status: 500 }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 店舗名を取得
    const storeName = $('.display-name').first().text().trim() || 
                      $('h1.rdheader-name').first().text().trim() ||
                      $('h2.display-name').first().text().trim()

    // 住所を取得
    let address = ''
    const addressElement = $('p.rstinfo-table__address').first()
    if (addressElement.length > 0) {
      address = addressElement.text().trim()
    } else {
      // 別のパターンも試す
      address = $('.rstinfo-table__address').first().text().trim()
    }

    // 最寄り駅を取得（交通手段の全情報を取得、改行を保持）
    let nearestStation = ''
    
    // 交通手段セクションを探す
    $('th').each((_, elem) => {
      const headerText = $(elem).text().trim()
      if (headerText === '交通手段' || headerText.includes('アクセス')) {
        const tdElement = $(elem).next('td')
        if (tdElement.length > 0) {
          // HTMLの<br>タグを改行に変換
          tdElement.find('br').replaceWith('\n')
          // テキストを取得（改行を保持）
          let stationText = tdElement.text().trim()
          // 複数の空白を1つにまとめるが改行は保持
          stationText = stationText.split('\n').map(line => line.trim()).filter(line => line).join('\n')
          nearestStation = stationText
        }
      }
    })

    // 別のパターンも試す（linktree__parent-target-text）
    if (!nearestStation) {
      const stationElements: string[] = []
      $('.linktree__parent-target-text').each((_, elem) => {
        const text = $(elem).text().trim()
        if (text) {
          stationElements.push(text)
        }
      })
      if (stationElements.length > 0) {
        nearestStation = stationElements.join('\n')
      }
    }

    // さらに別のパターン（rstinfo-table__station）
    if (!nearestStation) {
      const stationElement = $('.rstinfo-table__station')
      stationElement.find('br').replaceWith('\n')
      const stationText = stationElement.text().trim()
      if (stationText) {
        nearestStation = stationText
      }
    }

    // 公式アカウント（Instagram）を取得
    let instagramUrl = ''
    let website = ''
    $('th').each((_, elem) => {
      const headerText = $(elem).text().trim()
      if (headerText === '公式アカウント') {
        const tdElement = $(elem).next('td')
        tdElement.find('a').each((_, linkElem) => {
          const href = $(linkElem).attr('href')
          if (href) {
            if (href.includes('instagram.com')) {
              instagramUrl = href
            } else if (headerText === '公式アカウント' && !href.includes('tabelog.com')) {
              // Instagram以外の公式アカウントリンク
              if (!website) {
                website = href
              }
            }
          }
        })
      } else if (headerText === 'ホームページ' || headerText === '公式HP') {
        const tdElement = $(elem).next('td')
        const link = tdElement.find('a').first().attr('href')
        if (link && !website) {
          website = link
        }
      }
    })

    // 食べログスコアと口コミ件数を取得
    let tabelogScore = ''
    const scoreElement = $('.rdheader-rating__score-val-dtl').first()
    if (scoreElement.length > 0) {
      const score = scoreElement.text().trim()
      // 口コミ件数を取得
      let reviewCount = ''
      $('.rdheader-rating__review-target').each((_, elem) => {
        const text = $(elem).text().trim()
        const match = text.match(/口コミ\s*(\d+)\s*件/)
        if (match) {
          reviewCount = match[1]
        }
      })
      if (reviewCount) {
        tabelogScore = `食べログスコア: ${score} (口コミ${reviewCount}件)`
      } else {
        tabelogScore = `食べログスコア: ${score}`
      }
    }

    // 席数を取得
    let seatCount: number | undefined = undefined
    $('th').each((_, elem) => {
      const text = $(elem).text().trim()
      if (text === '席数') {
        const seatText = $(elem).next('td').text().trim()
        const match = seatText.match(/(\d+)/)
        if (match) {
          seatCount = parseInt(match[1])
        }
      }
    })

    // 昼の予算を取得（改善版）
    let unitPriceLunch: number | undefined = undefined
    
    console.log('=== 昼の予算取得開始 ===')
    
    // パターン1: rdheader-budget から取得
    $('.rdheader-budget__icon--lunch').parent().each((_, parentElem) => {
      console.log('昼予算親要素HTML:', $(parentElem).html())
      $(parentElem).find('.rdheader-budget__price-target').each((_, elem) => {
        const text = $(elem).text().trim()
        console.log('昼予算テキスト (rdheader-budget):', text)
        // 全角・半角の¥に対応
        const matches = text.match(/[¥￥]([\d,]+)/g)
        if (matches && matches.length > 0) {
          const prices = matches.map(m => parseInt(m.replace(/[¥￥,]/g, '')))
          unitPriceLunch = Math.min(...prices) // 下限値を使用
          console.log('昼予算取得成功 (rdheader-budget):', unitPriceLunch)
        }
      })
    })

    // パターン2: rdheader-budget__price から直接取得
    if (!unitPriceLunch) {
      $('.rdheader-budget__price').each((_, elem) => {
        const parentHtml = $(elem).parent().html()
        if (parentHtml && (parentHtml.includes('lunch') || parentHtml.includes('ランチ'))) {
          const text = $(elem).text().trim()
          console.log('昼予算テキスト (rdheader-budget__price):', text)
          const matches = text.match(/[¥￥]([\d,]+)/g)
          if (matches && matches.length > 0) {
            const prices = matches.map(m => parseInt(m.replace(/[¥￥,]/g, '')))
            unitPriceLunch = Math.min(...prices)
            console.log('昼予算取得成功 (rdheader-budget__price):', unitPriceLunch)
          }
        }
      })
    }

    // パターン3: テーブルから取得
    if (!unitPriceLunch) {
      $('th').each((_, elem) => {
        const headerText = $(elem).text().trim()
        if (headerText === '予算' || headerText.includes('ランチ') || headerText.includes('昼')) {
          const tdElement = $(elem).next('td')
          let text = tdElement.text().trim()
          // 改行や空白を削除
          text = text.replace(/\s+/g, ' ').trim()
          console.log(`昼予算テキスト (テーブル: ${headerText}):`, text)
          
          // 昼と夜が混在している場合、昼の部分だけ抽出
          // 例: "￥8,000～￥9,999 ￥5,000～￥5,999" の場合、最初の価格帯が夜、2番目が昼
          const allMatches = text.match(/[¥￥]([\d,]+)～[¥￥]([\d,]+)/g)
          console.log('価格帯マッチ:', allMatches)
          
          if (allMatches && allMatches.length >= 2) {
            // 2番目の価格帯を昼として使用
            const lunchPriceRange = allMatches[1]
            const matches = lunchPriceRange.match(/[¥￥]([\d,]+)/g)
            if (matches && matches.length > 0) {
              const prices = matches.map(m => parseInt(m.replace(/[¥￥,]/g, '')))
              unitPriceLunch = Math.min(...prices)
              console.log('昼予算取得成功 (テーブル・2番目の価格帯):', unitPriceLunch)
            }
          } else if (allMatches && allMatches.length === 1) {
            // 1つだけの場合はそれを使用
            const matches = allMatches[0].match(/[¥￥]([\d,]+)/g)
            if (matches && matches.length > 0) {
              const prices = matches.map(m => parseInt(m.replace(/[¥￥,]/g, '')))
              unitPriceLunch = Math.min(...prices)
              console.log('昼予算取得成功 (テーブル・単一価格帯):', unitPriceLunch)
            }
          }
        }
      })
    }

    console.log('昼予算最終結果:', unitPriceLunch)

    // 夜の予算を取得（改善版）
    let unitPriceDinner: number | undefined = undefined
    
    console.log('=== 夜の予算取得開始 ===')
    
    // パターン1: rdheader-budget から取得
    $('.rdheader-budget__icon--dinner').parent().each((_, parentElem) => {
      console.log('夜予算親要素HTML:', $(parentElem).html())
      $(parentElem).find('.rdheader-budget__price-target').each((_, elem) => {
        const text = $(elem).text().trim()
        console.log('夜予算テキスト (rdheader-budget):', text)
        const matches = text.match(/[¥￥]([\d,]+)/g)
        if (matches && matches.length > 0) {
          const prices = matches.map(m => parseInt(m.replace(/[¥￥,]/g, '')))
          unitPriceDinner = Math.min(...prices) // 下限値を使用
          console.log('夜予算取得成功 (rdheader-budget):', unitPriceDinner)
        }
      })
    })

    // パターン2: rdheader-budget__price から直接取得
    if (!unitPriceDinner) {
      $('.rdheader-budget__price').each((_, elem) => {
        const parentHtml = $(elem).parent().html()
        if (parentHtml && (parentHtml.includes('dinner') || parentHtml.includes('ディナー'))) {
          const text = $(elem).text().trim()
          console.log('夜予算テキスト (rdheader-budget__price):', text)
          const matches = text.match(/[¥￥]([\d,]+)/g)
          if (matches && matches.length > 0) {
            const prices = matches.map(m => parseInt(m.replace(/[¥￥,]/g, '')))
            unitPriceDinner = Math.min(...prices)
            console.log('夜予算取得成功 (rdheader-budget__price):', unitPriceDinner)
          }
        }
      })
    }

    // パターン3: テーブルから取得
    if (!unitPriceDinner) {
      $('th').each((_, elem) => {
        const headerText = $(elem).text().trim()
        if (headerText === '予算' || headerText.includes('ディナー') || headerText.includes('夜')) {
          const tdElement = $(elem).next('td')
          let text = tdElement.text().trim()
          // 改行や空白を削除
          text = text.replace(/\s+/g, ' ').trim()
          console.log(`夜予算テキスト (テーブル: ${headerText}):`, text)
          
          // 昼と夜が混在している場合、夜の部分だけ抽出
          // 例: "￥8,000～￥9,999 ￥5,000～￥5,999" の場合、最初の価格帯が夜
          const allMatches = text.match(/[¥￥]([\d,]+)～[¥￥]([\d,]+)/g)
          console.log('価格帯マッチ:', allMatches)
          
          if (allMatches && allMatches.length >= 1) {
            // 最初の価格帯を夜として使用
            const dinnerPriceRange = allMatches[0]
            const matches = dinnerPriceRange.match(/[¥￥]([\d,]+)/g)
            if (matches && matches.length > 0) {
              const prices = matches.map(m => parseInt(m.replace(/[¥￥,]/g, '')))
              unitPriceDinner = Math.min(...prices)
              console.log('夜予算取得成功 (テーブル・最初の価格帯):', unitPriceDinner)
            }
          }
        }
      })
    }

    console.log('夜予算最終結果:', unitPriceDinner)

    // ジャンル（業態）を取得
    let businessType = ''
    $('.rdheader-subinfo__item--cuisine').first().each((_, elem) => {
      businessType = $(elem).text().trim()
    })

    // 写真URLを大きいサイズに変換する関数
    const convertToLargeImageUrl = (url: string): string => {
      if (!url) return url
      
      // 食べログの画像URLパターンを変換
      let largeUrl = url
        // サムネイルサイズを削除
        .replace(/\/\d+x\d+_rect\//, '/')
        .replace(/\/rs\//, '/r/')
        .replace(/\/sr\//, '/r/')
        // WebPをJPGに変換
        .replace(/\.webp$/, '.jpg')
        .replace(/\.jpg\.webp$/, '.jpg')
      
      // サイズ指定があれば大きいサイズに変更（例: 150x150 → 640x640）
      largeUrl = largeUrl
        .replace(/150x150/, '640x640')
        .replace(/300x300/, '640x640')
        .replace(/480x480/, '640x640')
      
      return largeUrl
    }

    // 写真を取得
    const photos: string[] = []
    const photoUrls = new Set<string>() // 重複チェック用
    let interiorPhoto = '' // 店内写真
    
    console.log('写真取得開始...')

    // パターン1: メイン写真エリア（rstinfo-photo-list）
    $('.rstinfo-photo-list__photo img, .rstinfo-photo-list img').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-original')
      if (src && !src.includes('noimage') && !photoUrls.has(src)) {
        const largeUrl = convertToLargeImageUrl(src)
        photoUrls.add(src)
        photos.push(largeUrl)
        console.log(`写真取得 (rstinfo-photo-list): ${largeUrl}`)
      }
    })

    // パターン2: 写真ギャラリー（js-gallery-image）
    $('.js-gallery-image, .p-gallery__item img').each((_, elem) => {
      const src = $(elem).attr('data-src') || $(elem).attr('src') || $(elem).attr('data-original')
      if (src && !src.includes('noimage') && !photoUrls.has(src)) {
        const largeUrl = convertToLargeImageUrl(src)
        photoUrls.add(src)
        photos.push(largeUrl)
        console.log(`写真取得 (gallery): ${largeUrl}`)
      }
    })

    // パターン3: ヘッダー写真（rdheader-photo）
    $('.rdheader-photo__item img, .rdheader-photo img').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-original')
      if (src && !src.includes('noimage') && !photoUrls.has(src)) {
        const largeUrl = convertToLargeImageUrl(src)
        photoUrls.add(src)
        photos.push(largeUrl)
        console.log(`写真取得 (rdheader-photo): ${largeUrl}`)
      }
    })

    // パターン4: トップ写真エリア
    $('.rstdtl-top-photos img, .rstdtl-top-photo img').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-original')
      if (src && !src.includes('noimage') && !photoUrls.has(src)) {
        const largeUrl = convertToLargeImageUrl(src)
        photoUrls.add(src)
        photos.push(largeUrl)
        console.log(`写真取得 (rstdtl-top-photos): ${largeUrl}`)
      }
    })

    // パターン5: 料理・内観・外観写真
    $('img[class*="photo"], img[class*="image"]').each((_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-original')
      const alt = $(elem).attr('alt') || ''
      
      // 食べログドメインの画像のみ対象
      if (src && src.includes('tblg.k-img.com') && !src.includes('noimage') && !photoUrls.has(src)) {
        const largeUrl = convertToLargeImageUrl(src)
        photoUrls.add(src)
        photos.push(largeUrl)
        console.log(`写真取得 (general): ${largeUrl}`)
      }
    })

    // パターン6: aタグ内のhref（大きい画像へのリンク）
    $('a[href*="tblg.k-img.com"]').each((_, elem) => {
      const href = $(elem).attr('href')
      if (href && !href.includes('noimage') && !photoUrls.has(href)) {
        const largeUrl = convertToLargeImageUrl(href)
        photoUrls.add(href)
        photos.push(largeUrl)
        console.log(`写真取得 (href): ${largeUrl}`)
      }
    })

    console.log(`合計 ${photos.length} 枚の写真を取得しました`)

    // 店内写真を最初の写真から取得
    if (photos.length > 0) {
      interiorPhoto = photos[0]
    }

    // 写真をphoto1〜photo6に割り当て（最初の写真は店内写真用に使用したので除外）
    const photoFields: any = {}
    photos.slice(1, 7).forEach((photo, index) => {
      photoFields[`photo${index + 1}`] = photo
    })

    const result = {
      name: storeName || undefined,
      address: address || undefined,
      nearestStation: nearestStation || undefined,
      website: website || undefined,
      instagramUrl: instagramUrl || undefined,
      tabelogScore: tabelogScore || undefined,
      seatCount,
      unitPriceLunch,
      unitPriceDinner,
      businessType: businessType || undefined,
      interiorPhoto: interiorPhoto || undefined,
      ...photoFields
    }

    // undefined のフィールドを削除
    Object.keys(result).forEach(key => {
      if (result[key as keyof typeof result] === undefined) {
        delete result[key as keyof typeof result]
      }
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('食べログ情報取得エラー:', error)
    return NextResponse.json(
      { error: '情報の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
