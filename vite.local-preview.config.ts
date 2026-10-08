import { mergeConfig } from 'vite';
import base from './vite.config';
export default mergeConfig(base, {server:{host:'0.0.0.0',port:5173,strictPort:true,proxy:{'/v1':'http://127.0.0.1:8016','/v3':'http://127.0.0.1:8016','/api':'http://127.0.0.1:8016'}}});
