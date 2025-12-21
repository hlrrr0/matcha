# 診断結果を活用した求人マッチング - 必要データ提案

## 📊 診断で測定する10の価値観

1. **給与** - salary
2. **給与の上がり幅** - salaryGrowth
3. **労働時間（拘束時間）** - workingHours
4. **休日数（年間休日）** - holidays
5. **にぎりまで任されるタイミング** - nigiriTiming
6. **先輩職人の数** - seniorChefs
7. **店舗の価格帯** - priceRange
8. **外国人客の多さ** - foreignCustomers
9. **職場の雰囲気** - workEnvironment
10. **SNS・PRへの積極性** - snsPr

---

## 🎯 求人/店舗データに追加すべきフィールド

### **1. 給与関連（salary / salaryGrowth）**

#### 既存フィールド
- ✅ `salaryInexperienced` (未経験者給与)
- ✅ `salaryExperienced` (経験者給与)

#### 追加推奨フィールド
```typescript
// Job型に追加
salaryMin?: number              // 最低給与（数値）例: 250000
salaryMax?: number              // 最高給与（数値）例: 350000
salaryAverage?: number          // 平均給与（数値）

// 昇給データ
salaryGrowthRate?: 'high' | 'medium' | 'low'  // 昇給スピード
salaryAfter1Year?: number       // 1年後の想定給与
salaryAfter3Years?: number      // 3年後の想定給与
salaryAfter5Years?: number      // 5年後の想定給与
annualSalaryIncrease?: number   // 年間昇給額（平均）
promotionOpportunity?: 'high' | 'medium' | 'low'  // 昇進機会
```

**マッチングロジック例:**
- `salary`重視の候補者 → `salaryMin`が高い求人を優先
- `salaryGrowth`重視 → `salaryGrowthRate: 'high'` または `salaryAfter3Years`が大きい求人

---

### **2. 労働時間関連（workingHours）**

#### 既存フィールド
- ✅ `workingHours` (文字列)

#### 追加推奨フィールド
```typescript
// Job/Store型に追加
averageWorkHoursPerDay?: number     // 1日平均労働時間 例: 10
averageWorkHoursPerWeek?: number    // 週平均労働時間 例: 50
averageOvertimeHours?: number       // 月平均残業時間 例: 20
workTimeFlexibility?: 'high' | 'medium' | 'low'  // 勤務時間の融通
shiftType?: 'fixed' | 'flexible' | 'rotation'    // シフトタイプ
canLeaveOnTime?: boolean            // 定時で帰れるか
```

**マッチングロジック例:**
- `workingHours`重視 → `averageWorkHoursPerDay <= 9` かつ `canLeaveOnTime: true`

---

### **3. 休日関連（holidays）**

#### 既存フィールド
- ✅ `holidays` (文字列)

#### 追加推奨フィールド
```typescript
// Job型に追加
annualHolidays?: number             // 年間休日数 例: 120
weeklyHolidays?: number             // 週休日数 例: 2
consecutiveHolidaysAvailable?: boolean  // 連休取得可能
longVacationAvailable?: boolean     // 長期休暇取得可能
holidayFlexibility?: 'high' | 'medium' | 'low'  // 休日の融通
```

**マッチングロジック例:**
- `holidays`重視 → `annualHolidays >= 110` または `weeklyHolidays >= 2`

---

### **4. にぎりタイミング関連（nigiriTiming）**

#### 既存フィールド
- ✅ `trainingPeriod` (Store型・文字列)

#### 追加推奨フィールド
```typescript
// Store型に追加
nigiriTrainingMonths?: number       // 握りまでの期間（月数）例: 12
skillProgressionSpeed?: 'fast' | 'medium' | 'slow'  // スキル習得スピード
earlyResponsibility?: boolean       // 早期に責任ある仕事を任せるか
independenceSupport?: 'high' | 'medium' | 'low'  // 独立支援レベル
```

**マッチングロジック例:**
- `nigiriTiming`重視 → `nigiriTrainingMonths <= 18` かつ `skillProgressionSpeed: 'fast'`

---

### **5. 先輩職人関連（seniorChefs）**

#### 新規追加フィールド
```typescript
// Store型に追加
seniorChefCount?: number            // ベテラン職人の数 例: 3
totalStaffCount?: number            // 全スタッフ数 例: 8
mentorshipProgram?: boolean         // メンター制度の有無
trainingQuality?: 'excellent' | 'good' | 'standard'  // 教育の質
experiencedChefRatio?: number       // 経験豊富な職人の割合 例: 0.6 (60%)
```

**マッチングロジック例:**
- `seniorChefs`重視 → `seniorChefCount >= 3` または `mentorshipProgram: true`

---

### **6. 価格帯関連（priceRange）**

#### 既存フィールド
- ✅ `unitPriceLunch` (Store型)
- ✅ `unitPriceDinner` (Store型)

#### 追加推奨フィールド
```typescript
// Store型に追加
priceCategory?: 'budget' | 'mid-range' | 'upscale' | 'luxury'
  // budget: 回転寿司・立ち食い（〜2000円）
  // mid-range: 町鮨（3000-8000円）
  // upscale: 高級鮨（10000-20000円）
  // luxury: 超高級オマカセ（20000円〜）

averageSpending?: number            // 平均客単価 例: 15000
michelinStars?: number              // ミシュラン星の数 例: 1
hasOmakaseCourse?: boolean          // おまかせコースの有無
ingredientQuality?: 'premium' | 'high' | 'standard'  // 食材の質
```

**マッチングロジック例:**
- `priceRange`重視 → `priceCategory: 'upscale' | 'luxury'` または `michelinStars >= 1`

---

### **7. 外国人客関連（foreignCustomers）**

#### 新規追加フィールド
```typescript
// Store型に追加
foreignCustomerRatio?: number       // 外国人客の割合 例: 0.7 (70%)
englishMenuAvailable?: boolean      // 英語メニューの有無
multilingualStaff?: boolean         // 多言語対応スタッフの有無
internationalEnvironment?: 'high' | 'medium' | 'low'  // 国際的な環境度
touristArea?: boolean               // 観光地に位置するか
```

**マッチングロジック例:**
- `foreignCustomers`重視 → `foreignCustomerRatio >= 0.5` または `touristArea: true`

---

### **8. 職場雰囲気関連（workEnvironment）**

#### 新規追加フィールド
```typescript
// Store/Job型に追加
workplaceAtmosphere?: 'strict' | 'balanced' | 'relaxed'
  // strict: 厳しい指導・高圧的
  // balanced: 厳しいが建設的
  // relaxed: 穏やか・風通し良い

teamworkLevel?: 'high' | 'medium' | 'low'       // チームワーク重視度
communicationStyle?: 'open' | 'hierarchical'    // コミュニケーションスタイル
harassmentFree?: boolean            // ハラスメントのない環境
supportiveManagement?: boolean      // サポート的な経営陣
workLifeBalanceSupport?: 'high' | 'medium' | 'low'  // WLB支援度
```

**マッチングロジック例:**
- `workEnvironment`重視 → `workplaceAtmosphere: 'relaxed' | 'balanced'` かつ `harassmentFree: true`

---

### **9. SNS・PR関連（snsPr）**

#### 既存フィールド
- ✅ `instagramUrl` (Store型)

#### 追加推奨フィールド
```typescript
// Store型に追加
instagramFollowers?: number         // Instagramフォロワー数 例: 50000
socialMediaActive?: boolean         // SNS積極的に活用しているか
brandRecognition?: 'high' | 'medium' | 'low'  // ブランド認知度
mediaAppearances?: number           // メディア露出回数（年間）
influencerVisits?: boolean          // インフルエンサーの来店実績
prActivityLevel?: 'high' | 'medium' | 'low'   // PR活動レベル
```

**マッチングロジック例:**
- `snsPr`重視 → `instagramFollowers >= 10000` または `brandRecognition: 'high'`

---

## 🔧 実装推奨の優先順位

### **Phase 1: 最優先（即効性高い）**
1. ✅ 給与の数値化（`salaryMin`, `salaryMax`）
2. ✅ 年間休日数（`annualHolidays`）
3. ✅ 平均労働時間（`averageWorkHoursPerDay`）
4. ✅ 握りまでの期間（`nigiriTrainingMonths`）
5. ✅ 価格カテゴリ（`priceCategory`）

### **Phase 2: 重要（精度向上）**
6. 昇給データ（`salaryAfter1Year`, `salaryAfter3Years`）
7. 先輩職人数（`seniorChefCount`）
8. 職場雰囲気（`workplaceAtmosphere`）
9. 外国人客割合（`foreignCustomerRatio`）
10. SNSフォロワー数（`instagramFollowers`）

### **Phase 3: 補助的（差別化）**
11. その他の詳細フィールド

---

## 💡 マッチングスコアリングアルゴリズム提案

```typescript
// 疑似コード
function calculateMatchScore(
  diagnosis: Diagnosis,
  job: Job,
  store: Store
): number {
  let score = 0
  const topValues = diagnosis.topValues // TOP3の価値観
  
  // TOP1は3倍の重み
  // TOP2は2倍の重み
  // TOP3は1.5倍の重み
  
  topValues.forEach((valueId, index) => {
    const weight = index === 0 ? 3 : index === 1 ? 2 : 1.5
    
    switch(valueId) {
      case 'salary':
        if (job.salaryMin >= 280000) score += 10 * weight
        break
      case 'holidays':
        if (job.annualHolidays >= 110) score += 10 * weight
        break
      // ... 他の価値観も同様
    }
  })
  
  return score
}
```

---

## 📝 次のステップ

1. **型定義の更新**: Job/Store型に新フィールドを追加
2. **入力フォームの更新**: 管理画面で新フィールドを入力可能に
3. **マッチングロジックの実装**: 診断結果と求人データを照合
4. **レコメンド機能の追加**: 候補者マイページに最適な求人を表示
5. **データ移行**: 既存求人データに新フィールドを追加（段階的に）

この構造により、診断結果を活用した高精度なマッチングが実現できます！
