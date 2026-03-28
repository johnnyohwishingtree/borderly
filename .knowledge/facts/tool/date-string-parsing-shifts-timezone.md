# Fact: Date String Parsing Shifts Timezone

`new Date('YYYY-MM-DD')` parses as UTC midnight, which shifts to the previous day in negative UTC offsets. Always use `new Date(year, month - 1, day)` for date-only strings.
