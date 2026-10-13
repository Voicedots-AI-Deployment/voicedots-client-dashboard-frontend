import { mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base, {cacheDir:'/root/voicedots/.local-qpg/vite-cache-main',define:{'import.meta.env.VITE_API_URL':JSON.stringify('/')},server:{host:'0.0.0.0',port:5173,strictPort:true,proxy:{'/v1':'http://127.0.0.1:8016','/v3':'http://127.0.0.1:8016','/api':'http://127.0.0.1:8016'}}});
