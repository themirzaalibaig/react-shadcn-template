export interface Pagination {
  page?: number
  limit?: number
}

export interface Sort {
  sort?: string
  order?: 'asc' | 'desc'
}

export interface Search {
  search?: string
  fields?: string[]
}

export interface DateRange {
  startDate?: Date
  endDate?: Date
}

export interface Status {
  status?: 'active' | 'inactive'
}

export interface Id {
  id?: string
}
