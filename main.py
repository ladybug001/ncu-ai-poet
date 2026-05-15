"""
AI 文案诗歌生成器 - FastAPI 后端
支持古诗、现代诗、朋友圈文案、对联、藏头诗等多种创作模式
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import httpx
import os

app = FastAPI(title="AI 妙笔生花", description="AI 文案与诗歌创作平台")

# ============ 环境变量配置 ============
API_KEY = os.getenv("SILICONFLOW_API_KEY", "")
API_URL = os.getenv("API_URL", "https://api.siliconflow.cn/v1/chat/completions")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")


# ============ Prompt 模板 ============
PROMPTS = {
    "classical_poem": (
        "你是一位精通中国古典诗词的大师。请根据以下主题创作一首古诗。"
        "要求：严格遵循格律，意境优美，用词典雅。{style_hint}"
        "\n\n主题：{topic}"
        "\n\n请直接输出诗歌内容，包含标题。可以在诗后附上简短的赏析（2-3句话）。"
    ),
    "modern_poem": (
        "你是一位才华横溢的现代诗人。请根据以下主题创作一首现代诗。"
        "要求：意象独特，情感真挚，语言有张力，富有节奏感。{style_hint}"
        "\n\n主题：{topic}"
        "\n\n请直接输出诗歌内容，包含标题。"
    ),
    "social_copy": (
        "你是一位资深社交媒体文案高手。请根据以下场景/主题，生成 3 条不同风格的朋友圈文案。"
        "风格分别是：1. 文艺清新 2. 幽默搞笑 3. 高级凡尔赛。"
        "每条文案控制在 50-120 字，可以包含合适的 emoji。{style_hint}"
        "\n\n场景/主题：{topic}"
    ),
    "couplet": (
        "你是一位楹联大师。请根据以下主题创作一副对联（上联+下联+横批）。"
        "要求：对仗工整，平仄协调，寓意美好。{style_hint}"
        "请额外再提供 2 副不同风格的对联供选择。"
        "\n\n主题：{topic}"
    ),
    "acrostic": (
        "你是一位精通藏头诗的诗人。请用以下文字作为每句诗的开头字，创作一首藏头诗。"
        "要求：每行以指定的字开头，整首诗意境连贯、语句通顺、富有诗意。{style_hint}"
        "\n\n藏头文字：{topic}"
        "\n\n请直接输出诗歌，并在最后标注出藏头字。"
    ),
    "haiku": (
        "你是一位俳句/短诗创作者。请根据以下主题，分别创作：\n"
        "1. 一首日式俳句（5-7-5 音节结构，中文呈现）\n"
        "2. 一首中式绝句小令\n"
        "3. 一首英文 Haiku\n"
        "要求：捕捉瞬间之美，意境空灵。{style_hint}"
        "\n\n主题：{topic}"
    ),
}


def build_prompt(mode: str, topic: str, style: str = "") -> str:
    """根据模式构建 prompt"""
    template = PROMPTS.get(mode, PROMPTS["classical_poem"])
    style_hint = f"\n附加风格要求：{style}" if style else ""
    return template.format(topic=topic, style_hint=style_hint)


# ============ API 路由 ============

@app.get("/", response_class=HTMLResponse)
async def root():
    """提供前端页面"""
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.post("/api/generate")
async def generate(request: Request):
    """调用大模型生成内容"""
    try:
        data = await request.json()
        mode = data.get("mode", "classical_poem")
        topic = data.get("topic", "").strip()
        style = data.get("style", "").strip()

        if not topic:
            return JSONResponse(
                {"error": "请输入创作主题"},
                status_code=400
            )

        if not API_KEY:
            return JSONResponse(
                {"error": "服务端未配置 API Key，请联系管理员"},
                status_code=500
            )

        prompt = build_prompt(mode, topic, style)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                API_URL,
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL_NAME,
                    "messages": [
                        {
                            "role": "system",
                            "content": "你是一位才华横溢的中文创作者，精通诗词歌赋和现代文案写作。你的回复要有文学性和艺术性。"
                        },
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 1024,
                    "temperature": 0.85,
                    "top_p": 0.9,
                },
            )

        if resp.status_code != 200:
            return JSONResponse(
                {"error": f"AI 服务调用失败 (HTTP {resp.status_code})"},
                status_code=502
            )

        result = resp.json()
        content = result["choices"][0]["message"]["content"]

        return JSONResponse({"content": content, "mode": mode})

    except httpx.TimeoutException:
        return JSONResponse({"error": "AI 响应超时，请稍后重试"}, status_code=504)
    except Exception as e:
        return JSONResponse({"error": f"服务器内部错误: {str(e)}"}, status_code=500)


@app.get("/api/health")
async def health():
    """健康检查"""
    return {"status": "ok", "model": MODEL_NAME}


# 挂载静态文件（放在路由之后，避免覆盖 API 路由）
app.mount("/static", StaticFiles(directory="static"), name="static")
