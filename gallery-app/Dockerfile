FROM node:20-alpine AS base

# 필요할 때만 의존성 설치
FROM base AS deps
WORKDIR /app

# 선호 패키지 매니저 기준으로 의존성 설치
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# 필요할 때만 소스 코드 재빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js는 일반 사용에 대한 완전 익명 텔레메트리 데이터를 수집합니다.
ENV NEXT_TELEMETRY_DISABLED=1

# Docker 환경에서 backend 컨테이너로 프록시
ENV API_BASE=http://backend:8080

RUN npm run build

# 프로덕션 이미지: 모든 파일을 복사하고 Next를 실행
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# 프리렌더 캐시에 올바른 권한 설정
RUN mkdir .next
RUN chown nextjs:nodejs .next

# output trace를 활용해 이미지 크기 축소
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
