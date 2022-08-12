import Axios from 'axios';
import Qs from 'qs';
import axiosRetry from 'axios-retry';
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'; // AbortController 的 polyfill

const localStorageKey = 'CUPSHE_REQUEST_HEADER'; // 请求头的缓存key

/**
 * @description 递归调用中间件(上一个中间件的返回值是下一个中间件的)
 * @param { Function [] } middleware 中间件列表
 * @returns 
 */
const compose = (middlewares) => {
  if (middlewares.length === 0) {
    return arg => arg
  }
  if (middlewares.length === 1) {
    return middlewares[0]
  }
  return middlewares.reduce((a, b) => (...args) => a(b(...args)))
} 

/**
 * @description 判断是否是json字符串
 * @param { string } str json字符串
 * @returns { boolean }
 */
const isJsonString = (str) => {
  if (typeof str === 'string') {
    try {
      return typeof(JSON.parse(str) === 'object')
    } catch (e) {
      return false
    }
  }
  return false
}

/**
 * @description 从缓存拿配置的header
 * @returns { object } headers对象
 */
const getLocalHeaders = () => {
  const dataStr = localStorage.getItem(localStorageKey)
  return isJsonString(dataStr) ? JSON.parse(dataStr) : {}
}

/**
 * @description 生成请求身份Id(规则：将params 和 data 全部转为url 后的 querystring )
 * @param  {...any} args 请求参数(如：get: [url, config], post: [url, data, config])
 * @returns { string } id
 */
const generateKey = (...args) => {
  const isPost = args.length === 3;
  const url = args[0]
  const data = isPost ? args[1] : args[1]?.params
  const params = args[1]?.params || {}
  return url + '?' + [Qs.stringify(params), Qs.stringify(data)].join('&');
}


export const createAxios = ({
  baseURL = '',                                 // 请求地址
  timeout = 3000,                               // 请求持续时间
  headers = {},                                 // 请求头
  retry = 0,                                    // 请求失败重试次数
  requestError = (err) => Promise.reject(err),  // 请求失败处理函数
  responseError = (err) => Promise.reject(err)  // 响应失败处理函数
}={}) => {
  const requestQueue = new Map();              // 正在请求的队列
  const middleware = [];                       // 注册的所有中间件
  let abortInstance = new AbortController();
  let composeFn = arg => arg
  const axios = Axios.create({
    baseURL,
    timeout,
    signal: abortInstance.signal
  });

  // 当请求失败后，自动重新请求，只有3次失败后才真正失败
  axiosRetry(axios, {
    retries: retry,                  // 设置自动发送请求次数
    retryDelay: (retryCount) => retryCount * 1000, // 重复请求延迟（毫秒）
    shouldResetTimeout: true,       //  重置超时时间
    retryCondition: (error) => error.message.includes('timeout') || error.message.includes("status code") // true为打开自动发送请求，false为关闭自动发送请求。只有超时和http状态码错误时重试
  });
  
  const baseContext = {
    request: {},
    response: {}
  }

  const combine = (params) => Object.assign({}, baseContext, params)

  /**
   * @description 对重复请求进行去重
   * @param {*} request 请求的方法（axios.get、axios.post）
   * @returns { Promise }
   */
  const getRequest = (request) => {
    return (...args) => {
      const requestKey = generateKey(...args)                      // 根据请求参数生成key
      const pendingRequest = requestQueue.get(requestKey)          // 根据key获取请求的promise
      if (pendingRequest) {
        return pendingRequest;
      }
      const fetch = request(...args)
      requestQueue.set(requestKey, fetch)
      return fetch.finally(() => requestQueue.delete(requestKey))  // 接口返回后在队列中删除
    }
  }

  /**
   * @description 可取消请求
   * @param {*} request 
   * @returns 
   */
  const cancelRequest = (request) => {
    return (...args) => {
      const abortInstance = new AbortController()
      // 根据请求参数生成key
      const requestKey = generateKey(...args)
      // 根据key获取请求的promise
      const pendingRequest = requestQueue.get(requestKey)
      if (pendingRequest) {
        return [pendingRequest, controller.abort.bind(controller)];
      }
 
      switch (request) {
        case axios.get:
          args[1] = Object.assign({}, args[1], {signal: abortInstance.signal})
          break
        case axios.post:
          args[2] = Object.assign({}, args[2], {signal: abortInstance.signal})
          break
      }
      const fetch = request(...args)
      requestQueue.set(requestKey, fetch)
      return [
        fetch.finally(() => requestQueue.delete(requestKey)), // 接口返回后在队列中删除
        abortInstance.abort.bind(abortInstance)               // 取消请求的方法
      ]
    }
  }

  axios.interceptors.request.use(
   (config) => {
     const localHeaders = getLocalHeaders()
     config.headers = Object.assign({}, localHeaders, headers)
     return composeFn(combine({request: config}))?.request;
   },
   requestError
  )
  
  axios.interceptors.response.use(
    (response) => {
      if (response.status === 200) {
        return composeFn(combine({response: response.data}))?.response;
      }
    },
    responseError
  )

  return Object.assign({}, axios, {
    get: getRequest(axios.get),
    post: getRequest(axios.post),
    cancel: abortInstance.abort.bind(abortInstance), // cancel 所有请求
    cancelGet: cancelRequest(axios.get),             // cancel 单个请求
    cancelPost: cancelRequest(axios.post),
    use: (fn) => {
      middleware.push(fn)
      composeFn = compose(middleware)
    }
  })
}
