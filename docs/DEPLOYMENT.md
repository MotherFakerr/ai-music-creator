# Cloudflare Pages 部署流程

## 方式一：GitHub 自动部署（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages** → **Connect to Git**
3. 选择仓库 `MotherFakerr/ai-music-creator`
4. 配置构建设置：

| 设置 | 值 |
|-----|-----|
| Framework preset | **None** |
| Build command | `pnpm install && pnpm run build` |
| Build output directory | `packages/web/dist` |
| Root directory | `/` |

5. 点击 **Save and Deploy**

---

## 方式二：wrangler CLI 手动部署

### 前置准备

1. **创建 API Token**
   - https://dash.cloudflare.com/profile/api-tokens
   - Create Custom Token
   - Token name: `wrangler-pages-deploy`
   - Permissions:
     - `Account` → `Cloudflare Pages` → `Edit`
     - `User` → `User Details` → `Read`

2. **设置环境变量**
   ```bash
   export CLOUDFLARE_API_TOKEN="你的token"
   ```

### 部署命令

```bash
cd /home/motherfaker/workspace/ai-music-creator
export CLOUDFLARE_API_TOKEN="你的token"
npx wrangler pages deploy packages/web/dist --project-name=ai-music-creator
```

### 验证部署

```bash
curl -I https://ai-music-creator.pages.dev
```

---

## 项目信息

- **构建产物目录**: `packages/web/dist`
- **Pages 项目名**: `ai-music-creator`
- **Account ID**: `bf647b56fbc08806efdbe346e0f6d55b`

---

## 注意事项

1. **Monorepo 问题**：Cloudflare Pages 默认从根目录构建，需要设置 **Root directory** 为 `/`
2. **依赖安装**：确保 `pnpm-lock.yaml` 提交到仓库
3. **环境变量**：如需环境变量，在 Cloudflare Dashboard → Pages → Settings → Environment variables 中设置
