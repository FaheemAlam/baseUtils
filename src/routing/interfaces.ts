export interface ErrorItem {
  message: string,
  statusCode: number,
  err_code?: string | number,
  uri?: string
}
export interface ErrorList {
  [key: string]: ErrorItem,
}
