import React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DatePickerInterface {
  value: string | undefined;
  setValue: (event: string) => void;
  monthPlaceholder?: string;
  yearPlaceholder?: string;
  monthRequired: boolean;
  yearRequired?: boolean;
}

// Generate years array (adjust range as needed)
const generateYears = (startYear = 1950, endYear = new Date().getFullYear()) => {
  const years = [];
  for (let year = endYear; year >= startYear; year--) {
    years.push(year);
  }
  return years;
};

// Months array
const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const years = generateYears();

// Custom DatePicker Component
const MonthPicker: React.FC<DatePickerInterface> = ({ value, setValue, monthPlaceholder = "Select Month", yearPlaceholder = "Select Year", monthRequired = false, yearRequired = false}) => {
  const [year, month] = value ? value.split('-') : ['', ''];

  const handleMonthChange = (newMonth: string) => {
    const newValue = year ? `${year}-${newMonth}` : `${new Date().getFullYear()}-${newMonth}`;
    console.log(newValue);
    setValue(newValue);
  };

  const handleYearChange = (newYear: string) => {
    const newValue = month ? `${newYear}-${month}` : `${newYear}-01`;
    console.log(newValue);
    setValue(newValue);
  };
  
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        required={monthRequired}
        value={month}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-full truncate">
          <SelectValue placeholder={monthPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {months.map((monthItem) => (
              <SelectItem key={monthItem.value} value={monthItem.value}>
                {monthItem.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      <Select
        required={yearRequired}
        value={year}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-full truncate">
          <SelectValue placeholder={yearPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {years.map((yearItem) => (
              <SelectItem key={yearItem} value={yearItem.toString()}>
                {yearItem}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default MonthPicker;