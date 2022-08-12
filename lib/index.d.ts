import { AxiosRequestHeaders, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

type AxiosContext<T> = {
  request: AxiosRequestConfig
  response: T
}

export declare function createAxios (params: {
 baseURL?: string,
 timeout?: number,
 headers?: AxiosRequestHeaders,
 retry?: number,
 requestError?: (error: any) => any,
 responseError?: (error: any) => any
}): AxiosInstance & {
  cancelGet<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): [Promise<R>, () => void],
  cancelPost<T = any, R = AxiosResponse<T>, D = any> (url: string, data?: D, config?: AxiosRequestConfig<D>): [Promise<R>, () => void],
  use<T>(func: (params: AxiosContext<T>) => AxiosContext<T>)
}