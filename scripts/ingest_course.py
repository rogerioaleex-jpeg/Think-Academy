"""
Ingesta um curso completo (JSON) na plataforma via API admin.

Uso:
  python scripts/ingest_course.py <caminho_do_json>

Formato esperado do JSON — ver docs/course-json-schema.md ou o exemplo
gerado pelos agentes de conteúdo:

{
  "title": "...", "slug": "...", "shortDescription": "...", "description": "...",
  "difficulty": "EASY|MEDIUM|HARD|EXPERT", "estimatedHours": 20,
  "learningOutcomes": ["...", ...],
  "modules": [
    {
      "title": "...", "description": "...",
      "lessons": [ {"title": "...", "content": "<markdown>"} ],
      "quiz": {
        "title": "...",
        "questions": [
          {"prompt": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "...", "difficulty": "MEDIUM"}
        ]
      }
    }
  ]
}

Autenticação: usa o cookie de admin já salvo em
C:\\Users\\ROGERI~1.JUN\\AppData\\Local\\Temp\\tica_admin_cookies.txt (formato Netscape,
gerado por `curl -c`). Rode o login admin antes se o token tiver expirado:

  curl -c /tmp/tica_admin_cookies.txt -X POST https://tica-api.onrender.com/api/auth/login \
    -H "Content-Type: application/json" -d '{"email":"admin@thinkit.academy","password":"<senha>"}'
"""
import json
import os
import sys
import urllib.request
import urllib.error

API = "https://tica-api.onrender.com/api"
COOKIE_FILE = r"C:\Users\ROGERI~1.JUN\AppData\Local\Temp\tica_admin_cookies.txt"


def read_access_token():
    access = None
    with open(COOKIE_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("#HttpOnly_"):
                line = line[len("#HttpOnly_"):]
            elif line.startswith("#") or not line:
                continue
            parts = line.split("\t")
            if len(parts) >= 7 and parts[5] == "access_token":
                access = parts[6]
    return access


def request(method, path, body=None):
    access = read_access_token()
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json; charset=utf-8", "Cookie": f"access_token={access}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode("utf-8", errors="replace")
        print(f"ERRO {method} {path}: HTTP {e.code} — {body_txt[:500]}", file=sys.stderr)
        raise


def ingest(course_path):
    with open(course_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    course = request("POST", "/courses", {
        "title": data["title"],
        "slug": data["slug"],
        "shortDescription": data.get("shortDescription"),
        "description": data.get("description"),
        "difficulty": data.get("difficulty", "MEDIUM"),
        "estimatedHours": data.get("estimatedHours", 0),
        "learningOutcomes": data.get("learningOutcomes", []),
    })
    course_id = course["id"]
    print(f"Curso criado: {course_id} — {course['title']}")

    for mi, mod in enumerate(data["modules"]):
        module = request("POST", f"/courses/{course_id}/modules", {
            "title": mod["title"], "description": mod.get("description"), "order": mi,
        })
        module_id = module["id"]
        print(f"  Módulo {mi + 1}: {module_id} — {mod['title']}")

        li = 0
        for lesson in mod.get("lessons", []):
            request("POST", f"/courses/modules/{module_id}/lessons", {
                "title": lesson["title"], "type": "TEXT", "content": lesson["content"], "order": li,
            })
            li += 1
            print(f"    Aula {li}: {lesson['title']} ({len(lesson['content'])} chars)")

        quiz = mod.get("quiz")
        if quiz and quiz.get("questions"):
            exam = request("POST", "/admin/exams", {
                "title": quiz.get("title", f"Questões — {mod['title']}"),
                "kind": "QUIZ",
                "category": data.get("category", data["title"]),
                "difficulty": "MEDIUM",
                "questionCount": len(quiz["questions"]),
                "durationMin": 0,
                "passScorePct": 70,
                "maxAttempts": 0,
            })
            exam_id = exam["id"]
            for q in quiz["questions"]:
                question = request("POST", "/admin/exams/questions", {
                    "prompt": q["prompt"],
                    "explanation": q.get("explanation"),
                    "category": data.get("category", data["title"]),
                    "difficulty": q.get("difficulty", "MEDIUM"),
                    "options": [
                        {"text": opt, "isCorrect": (i == q["correctIndex"])}
                        for i, opt in enumerate(q["options"])
                    ],
                })
                request("POST", f"/admin/exams/{exam_id}/questions", {"questionIds": [question["id"]]})
            request("POST", f"/courses/modules/{module_id}/lessons", {
                "title": quiz.get("title", f"Questões — {mod['title']}"), "type": "QUIZ", "examId": exam_id, "order": li,
            })
            print(f"    Quiz: {exam_id} — {len(quiz['questions'])} questões")

    print(f"FIM: curso '{data['title']}' completo. id={course_id}")
    return course_id


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python ingest_course.py <caminho_do_json>", file=sys.stderr)
        sys.exit(1)
    ingest(sys.argv[1])
