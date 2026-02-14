"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'
import { Store } from '@/types/store'
import { Company } from '@/types/company'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { extractPrefecture } from '@/lib/utils/prefecture'
import { geocodeAddress } from '@/lib/google-maps'
import { authenticatedPost } from '@/lib/api-client'
import { TabelogInfoSection } from './TabelogInfoSection'
import { BasicInfoSection } from './BasicInfoSection'
import { DetailSection } from './DetailSection'
import { PhotoSection } from './PhotoSection'
import { TagSection } from './TagSection'

interface StoreFormProps {
  initialData?: Partial<Store>
  onSubmit: (data: Partial<Store>) => Promise<void>
  isEdit?: boolean
  loading?: boolean
}

export default function StoreForm({ 
  initialData = {}, 
  onSubmit, 
  isEdit = false,
  loading = false 
}: StoreFormProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [additionalPhotosCount, setAdditionalPhotosCount] = useState(0)
  const [tabelogUrlError, setTabelogUrlError] = useState<string>('')
  const [geocoding, setGeocoding] = useState(false)
  const [autoGeocodingEnabled, setAutoGeocodingEnabled] = useState(true)
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [fetchingTabelog, setFetchingTabelog] = useState(false)
  const [formData, setFormData] = useState<Partial<Store>>({
    companyId: '',
    name: '',
    businessType: '',
    address: '',
    nearestStation: '',
    website: '',
    unitPriceLunch: undefined,
    unitPriceDinner: undefined,
    seatCount: undefined,
    isReservationRequired: false,
    instagramUrl: '',
    tabelogUrl: '',
    tabelogUrlException: '',
    tabelogUrlExceptionOther: '',
    googleReviewScore: '',
    tabelogScore: '',
    reputation: '',
    staffReview: '',
    trainingPeriod: '',
    ownerPhoto: '',
    ownerVideo: '',
    interiorPhoto: '',
    photo1: '',
    photo2: '',
    photo3: '',
    photo4: '',
    photo5: '',
    photo6: '',
    photo7: '',
    status: 'active'
  })

  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      setFormData({
        companyId: initialData.companyId || '',
        name: initialData.name || '',
        businessType: initialData.businessType || '',
        address: initialData.address || '',
        latitude: initialData.latitude,
        longitude: initialData.longitude,
        nearestStation: initialData.nearestStation || '',
        website: initialData.website || '',
        unitPriceLunch: initialData.unitPriceLunch,
        unitPriceDinner: initialData.unitPriceDinner,
        seatCount: initialData.seatCount,
        isReservationRequired: initialData.isReservationRequired || false,
        instagramUrl: initialData.instagramUrl || '',
        tabelogUrl: initialData.tabelogUrl || '',
        tabelogUrlException: initialData.tabelogUrlException || '',
        tabelogUrlExceptionOther: initialData.tabelogUrlExceptionOther || '',
        googleReviewScore: initialData.googleReviewScore || '',
        tabelogScore: initialData.tabelogScore || '',
        reputation: initialData.reputation || '',
        staffReview: initialData.staffReview || '',
        trainingPeriod: initialData.trainingPeriod || '',
        ownerPhoto: initialData.ownerPhoto || '',
        ownerVideo: initialData.ownerVideo || '',
        interiorPhoto: initialData.interiorPhoto || '',
        photo1: initialData.photo1 || '',
        photo2: initialData.photo2 || '',
        photo3: initialData.photo3 || '',
        photo4: initialData.photo4 || '',
        photo5: initialData.photo5 || '',
        photo6: initialData.photo6 || '',
        photo7: initialData.photo7 || '',
        status: initialData.status || 'active',
        ...initialData
      })

      // 既存の追加写真の数を計算
      const photoFields = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5', 'photo6', 'photo7']
      const existingPhotos = photoFields.filter(field => initialData[field as keyof Store])
      setAdditionalPhotosCount(existingPhotos.length)
    }
  }, [initialData])

  useEffect(() => {
    const loadCompanies = async () => {
      setLoadingCompanies(true)
      try {
        const companiesSnapshot = await getDocs(collection(db, 'companies'))
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Company))
        setCompanies(companiesData)
      } catch (error) {
        console.error('Error loading companies:', error)
      } finally {
        setLoadingCompanies(false)
      }
    }

    loadCompanies()
  }, [])

  const handleChange = (field: keyof Store, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 食べログURLの重複チェック
    if (field === 'tabelogUrl' && value) {
      checkTabelogUrlDuplicate(value)
    } else if (field === 'tabelogUrl') {
      setTabelogUrlError('')
    }
  }

  const checkTabelogUrlDuplicate = async (url: string) => {
    if (!url) {
      setTabelogUrlError('')
      return
    }

    try {
      const storesQuery = query(
        collection(db, 'stores'),
        where('tabelogUrl', '==', url)
      )
      const storesSnapshot = await getDocs(storesQuery)
      
      const duplicates = storesSnapshot.docs.filter(doc => 
        !isEdit || doc.id !== initialData.id
      )
      
      if (duplicates.length > 0) {
        setTabelogUrlError('この食べログURLは既に登録されています')
      } else {
        setTabelogUrlError('')
      }
    } catch (error) {
      console.error('Error checking tabelog URL:', error)
    }
  }

  // 住所が変更されたら自動的に緯度経度を取得（debounce付き）
  const autoGeocodeAddress = useCallback(async (address: string) => {
    if (!address || !autoGeocodingEnabled) return
    
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current)
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await geocodeAddress(address)
        if (result) {
          setFormData(prev => ({
            ...prev,
            latitude: result.lat,
            longitude: result.lng
          }))
        }
      } catch (error: any) {
        console.error('❌ 自動Geocodingエラー:', error)
      }
    }, 1000)
  }, [autoGeocodingEnabled])

  // 手動で住所から緯度経度を取得
  const handleGeocodeAddress = async () => {
    if (!formData.address) {
      alert('住所を入力してください')
      return
    }

    setGeocoding(true)
    try {
      const result = await geocodeAddress(formData.address)
      if (result) {
        setFormData(prev => ({
          ...prev,
          latitude: result.lat,
          longitude: result.lng
        }))
        alert(`✅ 緯度経度を取得しました!\n\n緯度: ${result.lat}\n経度: ${result.lng}\n\n保存ボタンを押してください。`)
      } else {
        alert('❌ 住所から緯度経度を取得できませんでした。\n\n住所の形式を確認してください。\n例: 東京都港区六本木1-1-1')
      }
    } catch (error: any) {
      console.error('Geocoding error:', error)
      const errorMessage = error.message || '緯度経度の取得中にエラーが発生しました'
      alert(`❌ エラー: ${errorMessage}\n\nブラウザのコンソールで詳細を確認してください。`)
    } finally {
      setGeocoding(false)
    }
  }

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    }
  }, [])

  // 食べログURLから情報を取得
  const handleFetchTabelogInfo = async () => {
    if (!formData.tabelogUrl) {
      alert('食べログURLを入力してください')
      return
    }

    setFetchingTabelog(true)
    try {
      const data = await authenticatedPost('/api/tabelog/fetch', {
        url: formData.tabelogUrl
      })

      if (!data) {
        throw new Error('情報の取得に失敗しました')
      }
      
      const photoCount = [1, 2, 3, 4, 5, 6].filter(i => data[`photo${i}`]).length
      const hasInteriorPhoto = !!data.interiorPhoto
      
      setFormData(prev => ({
        ...prev,
        ...(data.name && !prev.name && { name: data.name }),
        ...(data.address && !prev.address && { address: data.address }),
        ...(data.nearestStation && !prev.nearestStation && { nearestStation: data.nearestStation }),
        ...(data.website && !prev.website && { website: data.website }),
        ...(data.instagramUrl && !prev.instagramUrl && { instagramUrl: data.instagramUrl }),
        ...(data.tabelogScore && !prev.tabelogScore && { tabelogScore: data.tabelogScore }),
        ...(data.seatCount && !prev.seatCount && { seatCount: data.seatCount }),
        ...(data.unitPriceLunch && !prev.unitPriceLunch && { unitPriceLunch: data.unitPriceLunch }),
        ...(data.unitPriceDinner && !prev.unitPriceDinner && { unitPriceDinner: data.unitPriceDinner }),
        ...(data.businessType && !prev.businessType && { businessType: data.businessType }),
        ...(data.interiorPhoto && !prev.interiorPhoto && { interiorPhoto: data.interiorPhoto }),
        ...(data.photo1 && !prev.photo1 && { photo1: data.photo1 }),
        ...(data.photo2 && !prev.photo2 && { photo2: data.photo2 }),
        ...(data.photo3 && !prev.photo3 && { photo3: data.photo3 }),
        ...(data.photo4 && !prev.photo4 && { photo4: data.photo4 }),
        ...(data.photo5 && !prev.photo5 && { photo5: data.photo5 }),
        ...(data.photo6 && !prev.photo6 && { photo6: data.photo6 }),
      }))

      if (photoCount > additionalPhotosCount) {
        setAdditionalPhotosCount(photoCount)
      }

      if (data.address && !formData.address && autoGeocodingEnabled) {
        autoGeocodeAddress(data.address)
      }

      const photoMessage = photoCount > 0 || hasInteriorPhoto 
        ? `\n\n写真を取得しました: ${hasInteriorPhoto ? '店内写真1枚' : ''}${photoCount > 0 ? ` 素材写真${photoCount}枚` : ''}` 
        : ''
      alert(`✅ 食べログから情報を取得しました！${photoMessage}\n\n既に入力されている項目は上書きされません。`)
    } catch (error: any) {
      console.error('食べログ情報取得エラー:', error)
      alert(`❌ エラー: ${error.message}`)
    } finally {
      setFetchingTabelog(false)
    }
  }

  const addPhotoField = () => {
    if (additionalPhotosCount < 7) {
      setAdditionalPhotosCount(prev => prev + 1)
    }
  }

  const removePhotoField = () => {
    if (additionalPhotosCount > 0) {
      const photoFieldToRemove = `photo${additionalPhotosCount}` as keyof Store
      setFormData(prev => ({
        ...prev,
        [photoFieldToRemove]: ''
      }))
      setAdditionalPhotosCount(prev => prev - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyId || !formData.name) {
      alert('必須項目を入力してください')
      return
    }

    const hasException = formData.tabelogUrlException
    if (!hasException && !formData.tabelogUrl) {
      alert('食べログURLを入力するか、例外理由を選択してください')
      return
    }

    if (tabelogUrlError) {
      alert('食べログURLが既に登録されています。別のURLを入力してください')
      return
    }

    const cleanFormData = { ...formData }
    
    if (cleanFormData.address) {
      cleanFormData.prefecture = extractPrefecture(cleanFormData.address)
    }
    
    Object.keys(cleanFormData).forEach(key => {
      const fieldKey = key as keyof Store
      if (cleanFormData[fieldKey] === undefined) {
        delete cleanFormData[fieldKey]
      }
    })

    await onSubmit(cleanFormData)
  }

  // ⌘+S / Ctrl+S でフォーム保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!loading && !fetchingTabelog && !geocoding) {
          const form = document.querySelector('form')
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, fetchingTabelog, geocoding])

  if (loadingCompanies) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">企業データを読み込み中...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fetchingTabelog && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="font-semibold">食べログから情報を取得中...</span>
          </div>
        </div>
      )}

      <TabelogInfoSection
        tabelogUrl={formData.tabelogUrl || ''}
        tabelogUrlException={formData.tabelogUrlException || ''}
        tabelogUrlExceptionOther={formData.tabelogUrlExceptionOther || ''}
        tabelogUrlError={tabelogUrlError}
        fetchingTabelog={fetchingTabelog}
        onFieldChange={handleChange}
        onFetchTabelog={handleFetchTabelogInfo}
      />

      <BasicInfoSection
        formData={formData}
        companies={companies}
        loadingCompanies={loadingCompanies}
        geocoding={geocoding}
        autoGeocodingEnabled={autoGeocodingEnabled}
        onFieldChange={handleChange}
        onGeocode={handleGeocodeAddress}
        onAutoGeocodeToggle={setAutoGeocodingEnabled}
        onAddressChange={autoGeocodeAddress}
      />

      <DetailSection
        formData={formData}
        onFieldChange={handleChange}
      />

      <PhotoSection
        formData={formData}
        additionalPhotosCount={additionalPhotosCount}
        onFieldChange={handleChange}
        onAddPhoto={addPhotoField}
        onRemovePhoto={removePhotoField}
      />

      <TagSection
        formData={formData}
        onFieldChange={handleChange}
      />

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? '更新中...' : '保存中...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? '店舗を更新' : '店舗を追加'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
