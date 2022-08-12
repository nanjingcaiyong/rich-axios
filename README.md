# `rich-axios`
> rich-axios 面向企业级项目，只对请求行为进行抽象，业务能力通过中间件赋予，以拓展相应的中间件包。

## 基础功能
1. 同一时间并发多个相同url、相同参数的请求，会优化成一个请求返回
2. 请求失败重试(timeout, status code)
3. 取消正在pending的某个请求或所有请求
4. 利用洋葱模型对request、reponse拦截器合并进行处理

## 使用

1. 创建实例
   ```js
   import { createAxios } from 'rich-axios';

   const instance = createAxios({
     baseURL = '',                                 // 请求地址
     timeout = 3000,                               // 请求持续时间
     headers = {},                                 // 请求头
     retry = 3,                                    // 请求失败重试次数
     requestError = (err) => Promise.reject(err),  // 请求失败处理函数
     responseError = (err) => Promise.reject(err)  // 响应失败处理函数
   })
   ```

1. 发起请求

    ```js
    // 普通请求
    const fetch = instance.get(url: string, config?: AxiosRequestConfig)
    const fetch = instance.post(url: string, data?: any, config?: AxiosRequestConfig)
    const fetch = instance.delete(url: string, config?: AxiosRequestConfig)
    const fetch = instance.head(url: string, config?: AxiosRequestConfig)
    const fetch = instance.put(url: string, data?: any, config?: AxiosRequestConfig)
    const fetch = instance.patch(url: string, data?: any, config?: AxiosRequestConfig)

    // 可取消请求
    const [fetch, cancel] = instance.cancelGet(url: string, config?: AxiosRequestConfig)

    const [fetch, cancel] = instance.cancelPost(url: string, data?: any, config?: AxiosRequestConfig)
    // 取消当前正在pending的请求
    cancel()

    // 取消所有pending的请求
    instance.cancel()
    ```

3. 使用中间件（合并了request和reponse拦截器，便于开发和拓展各种中间件）
    ```js
    instance.use((ctx) => {
      // 交给请求拦截器处理
      ctx.request.data = Object.assign(ctx.request.data, { author: 'yong.cai' });
      // 交给响应拦截器处理
      ctx.response = ctx.response.data;
      return ctx;
    });
    ```