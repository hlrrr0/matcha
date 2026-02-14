'use client'

import { Camera } from 'lucide-react'
import { ImageData } from './PublicJobTypes'

interface ImageSliderProps {
  images: ImageData[]
  currentSlide: number
  onImageClick: (src: string, alt: string) => void
  onSlideChange: (index: number) => void
}

const ImageSlider = ({ images, currentSlide, onImageClick, onSlideChange }: ImageSliderProps) => {
  if (images.length === 0) return null

  return (
    <div className="relative">
      {/* メイン画像 */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
        <img
          src={images[currentSlide].src}
          alt={images[currentSlide].alt}
          className="w-full h-full object-contain cursor-pointer"
          onClick={() => onImageClick(images[currentSlide].src, images[currentSlide].alt)}
        />

        {/* 画像情報 */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
          {images[currentSlide].alt}
        </div>

        {/* スライド番号 */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
          {currentSlide + 1} / {images.length}
        </div>
      </div>

      {/* サムネイルナビゲーション */}
      {images.length > 1 && (
        <div className="p-2">
          <div className="flex gap-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => onSlideChange(index)}
                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  index === currentSlide 
                    ? 'border-blue-500 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageSlider
