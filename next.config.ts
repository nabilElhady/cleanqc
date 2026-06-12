import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import withSerwistInit from '@serwist/next'
import type { NextConfig } from "next";

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  randomUUID()

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  disable: process.env.NODE_ENV !== 'production',
  globPublicPatterns: ['**/*.{png,svg,ico,webp}'],
})

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  turbopack: {},
};

export default withSerwist(nextConfig);
