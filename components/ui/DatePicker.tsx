
'use client'

import React, { forwardRef } from 'react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { CalendarIcon } from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'
import { format } from 'date-fns'

interface CustomDatePickerProps {
    selected?: Date | null
    onChange: (date: Date | null) => void
    placeholderText?: string
    className?: string
    id?: string
    name?: string
    minDate?: Date
    maxDate?: Date
    disabled?: boolean
    required?: boolean
    // Allows passing other props if needed
    icon?: React.ElementType
    [key: string]: any
}

// Custom input component to style the date picker trigger perfectly
// Using forwardRef to work with React DatePicker
const CustomInput = forwardRef<HTMLButtonElement, any>(
    ({ value, onClick, className, placeholder, disabled, id, icon: Icon = CalendarIcon }, ref) => (
        <button
            type="button"
            onClick={onClick}
            ref={ref}
            disabled={disabled}
            id={id}
            className={twMerge(
                clsx(
                    "relative w-full flex items-center justify-between px-3 py-2 text-sm text-left border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-0 focus:border-gray-500",
                    disabled
                        ? "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-900 border-gray-200"
                ),
                className
            )}
        >
            <span className={clsx(!value && "text-gray-500")}>
                {value || placeholder || "Select date"}
            </span>
            <Icon className="h-4 w-4 text-gray-500 ml-2 flex-shrink-0" />
        </button>
    )
)

CustomInput.displayName = 'CustomDatePickerInput'

export default function CustomDatePicker({
    selected,
    onChange,
    placeholderText = "Select date",
    className,
    id,
    name,
    minDate,
    maxDate,
    disabled,
    required,
    icon,
    ...props
}: CustomDatePickerProps) {
    return (
        <div className="relative w-full">
            <DatePicker
                selected={selected}
                onChange={onChange}
                placeholderText={placeholderText}
                customInput={<CustomInput id={id} disabled={disabled} className={className} icon={icon} />}
                dateFormat="dd.MM.yyyy"
                minDate={minDate}
                maxDate={maxDate}
                disabled={disabled}
                required={required}
                name={name}
                wrapperClassName="w-full"
                // Customizing the calendar container
                calendarClassName="!font-sans !border-none !shadow-xl !rounded-lg !bg-white overflow-hidden"
                dayClassName={(date) =>
                    "hover:!bg-blue-50 !rounded-full !text-gray-500 hover:!text-blue-600"
                }
                weekDayClassName={() => "!text-gray-500 !uppercase !text-xs !font-medium !py-2"}
                monthClassName={() => "!font-medium !text-gray-900"}
                renderCustomHeader={({
                    date,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                }) => (
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                        <button
                            onClick={decreaseMonth}
                            disabled={prevMonthButtonDisabled}
                            type="button"
                            className={clsx(
                                "p-1 rounded-full hover:bg-gray-300 transition-colors",
                                prevMonthButtonDisabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-semibold text-gray-900">
                            {format(date, "MMMM yyyy")}
                        </span>
                        <button
                            onClick={increaseMonth}
                            disabled={nextMonthButtonDisabled}
                            type="button"
                            className={clsx(
                                "p-1 rounded-full hover:bg-gray-300 transition-colors",
                                nextMonthButtonDisabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                )}
                {...props}
            />
            {name && (
                <input
                    type="hidden"
                    name={name}
                    value={selected ? format(selected, 'yyyy-MM-dd') : ''}
                />
            )}
            {/* Global overrides for react-datepicker to make it look modern without separate CSS file */}
            <style jsx global>{`
        .react-datepicker-popper {
          z-index: 50 !important;
        }
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        }
        .react-datepicker__header {
          background-color: white !important;
          border-bottom: none !important;
          padding-top: 0 !important;
        }
        .react-datepicker__day--selected, 
        .react-datepicker__day--keyboard-selected,
        .react-datepicker__day--selected:hover,
        .react-datepicker__day--keyboard-selected:hover {
          background-color: #2563eb !important; /* blue-600 */
          color: white !important;
          font-weight: bold !important;
          border-radius: 9999px !important;
        }
        .react-datepicker__day--today {
          font-weight: bold;
          color: #2563eb;
        }
        /* Ensure selected today day is white */
        .react-datepicker__day--today.react-datepicker__day--selected {
          color: white !important;
        }
        .react-datepicker__triangle {
          display: none;
        }
      `}</style>
        </div>
    )
}
