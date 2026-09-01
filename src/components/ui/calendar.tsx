import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

// react-day-picker 10 renamed the styling hooks: caption -> month_caption,
// nav_button_* -> button_*, head_row/head_cell -> weekdays/weekday, row -> week,
// day_selected -> selected, day_disabled -> disabled. Using the version 8 names
// fails the type check rather than degrading quietly, which is how this was
// caught.
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "relative",
        months: "block w-full",
        month: "w-full",
        month_caption: "flex justify-center pt-1 pb-2",
        caption_label: "text-sm font-medium text-slate-600 dark:text-slate-300",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          "absolute left-1 h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
          "transition-colors"
        ),
        button_next: cn(
          "absolute right-1 h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
          "transition-colors"
        ),
        month_grid: "w-full border-collapse text-sm table-fixed",
        weekdays: "flex",
        weekday: "text-slate-400 dark:text-slate-500 font-semibold w-9 h-9",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          "h-9 w-9 rounded-lg border border-transparent bg-transparent text-slate-700 dark:text-slate-200",
          "hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-slate-50",
          "transition-colors"
        ),
        selected:
          "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white focus:bg-indigo-600 focus:text-white dark:bg-indigo-500",
        range_start: "rounded-l-lg",
        range_end: "rounded-r-lg",
        range_middle: "bg-indigo-50 dark:bg-indigo-900/30",
        today: "font-semibold text-indigo-600 dark:text-indigo-400",
        outside: "text-slate-300 dark:text-slate-600",
        disabled: "text-slate-300 dark:text-slate-600 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
