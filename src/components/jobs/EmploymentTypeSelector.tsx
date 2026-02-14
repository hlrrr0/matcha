import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { EMPLOYMENT_TYPES } from './JobFormConstants'
import { isEmploymentTypeSelected, toggleEmploymentType } from './JobFormUtils'

interface EmploymentTypeSelectorProps {
  value: string
  onChange: (value: string) => void
}

const EmploymentTypeSelector = ({ value, onChange }: EmploymentTypeSelectorProps) => {
  const handleChange = (employmentType: string, checked: boolean) => {
    const updatedValue = toggleEmploymentType(employmentType, checked, value)
    onChange(updatedValue)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">雇用形態</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {EMPLOYMENT_TYPES.map(type => {
            const isSelected = isEmploymentTypeSelected(type, value)

            return (
              <div key={type} className="flex items-center space-x-3">
                <Checkbox
                  id={`employment-type-${type}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleChange(type, checked as boolean)}
                />
                <Label
                  htmlFor={`employment-type-${type}`}
                  className="cursor-pointer font-medium text-sm"
                >
                  {type}
                </Label>
              </div>
            )
          })}
        </div>

        {value && (
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <p className="text-gray-700">
              <span className="font-medium">選択中:</span> {value}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EmploymentTypeSelector
