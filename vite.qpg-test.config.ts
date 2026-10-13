import {mergeConfig} from 'vite';
import base from './vite.config';
// Test servers must not overwrite dependency caches used by live previews.
export default mergeConfig(base,{cacheDir:`node_modules/.vite-qpg-test-${process.env.ERP_TEST_PORT||5191}`});
