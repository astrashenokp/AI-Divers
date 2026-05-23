# save_progress tool

**Файл:** `app/tools/education/save_progress_tool.py`  
**Домен:** `education`  
**Тип:** domain tool  
**Статус зараз:** stub / mock  
**Призначення:** зафіксувати прогрес користувача в навчанні

---

## 1. Що це за tool

`save_progress` — це інструмент для освітнього агента, який має **зберігати факт навчального прогресу користувача**.

По суті він означає:

- користувач завершив урок;
- користувач пройшов певний етап курсу;
- агент має це зафіксувати в системі.

Приклад сенсу:

- юзер каже: "Я пройшов урок 5"
- агент викликає `save_progress`
- система зберігає, що для цього користувача урок завершений

---

## 2. Навіщо він потрібен

Без цього tool агент може:

- пояснювати теми;
- рекомендувати курси;
- допомагати з навчанням;

але не може **запам'ятати навчальний прогрес** як системну дію.

`save_progress` потрібен, щоб education-agent умів не лише відповідати, а ще й:

- відмічати завершення уроків;
- підтримувати навчальну історію;
- будувати подальші рекомендації на основі вже пройденого.

---

## 3. Що він приймає

Схема лежить у:
[tool_schemas.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tool_schemas.py)

`SaveProgressInput` має 3 поля:

- `user_id`
- `course_id`
- `lesson_id`

### Приклад

```json
{
  "user_id": "user-123",
  "course_id": "COURSE-101",
  "lesson_id": "L5"
}
```

---

## 4. Як це працює зараз

Поточна реалізація в
[save_progress_tool.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/education/save_progress_tool.py)
робить тільки таке:

1. Валідовує вхід через `SaveProgressInput`.
2. Не пише нічого в БД.
3. Повертає текстове повідомлення, ніби прогрес збережено.

Тобто зараз це **не реальне збереження**, а stub/mock.

Ось чому в коді є:

```python
# TODO: підключити БД від Стаса Data
```

---

## 5. Куди воно мало б зберігатися

У нормальній інтеграції `save_progress` має зберігати дані **не в Python напряму**, а через backend.

Правильна схема така:

```text
Agent
  ↓
save_progress tool
  ↓
backend internal/public API
  ↓
service layer
  ↓
database
```

Тобто:

- `agent-service` виконує tool;
- backend приймає дані;
- backend уже записує їх у БД.

---

## 6. Чому не варто зберігати це прямо в Python

Бо `agent-service` у вашій архітектурі — це runtime executor, а не основне сховище правди.

Довготривалі дані має контролювати backend + database, бо там:

- є основна бізнес-логіка;
- є доступ до БД;
- легше робити валідацію;
- легше контролювати ownership і permissions;
- легше вести audit.

---

## 7. Якої таблиці під це зараз не вистачає

По поточному backend-коду і схемі БД у вас є:

- `agents`
- `agent_tools`
- `guardrails`
- `chat_sessions`
- `messages`
- `agent_executions`
- `agent_execution_steps`
- `tool_call_history`
- `deployment_settings`

Але **окремої таблиці для навчального прогресу зараз немає**.

Тобто якщо робити `save_progress` по-справжньому, бекенду, найімовірніше, треба буде додати щось на кшталт:

- `user_course_progress`
- або `lesson_progress`
- або іншу таблицю прогресу

Наприклад логічні поля могли б бути такі:

- `id`
- `user_id`
- `course_id`
- `lesson_id`
- `completed_at`
- `created_at`

---

## 8. Що має зробити backend

Щоб `save_progress` став реальним, бекенд має:

1. Визначити модель даних для прогресу.
2. Додати таблицю в БД.
3. Зробити service/repository layer.
4. Додати endpoint або internal method для запису прогресу.
5. Повернути safe response назад у Python tool.

---

## 9. Який endpoint логічно мати

Оскільки це write-operation, тут краще окремий endpoint, а не `database_query`.

Наприклад:

```text
POST /internal/v1/education/progress
```

Payload:

```json
{
  "userId": "user-123",
  "courseId": "COURSE-101",
  "lessonId": "L5"
}
```

Приклад відповіді:

```json
{
  "status": "saved",
  "userId": "user-123",
  "courseId": "COURSE-101",
  "lessonId": "L5",
  "completedAt": "2026-05-23T12:00:00Z"
}
```

---

## 10. Чому це не `database_query`

Бо `database_query_tool` у вас задуманий як:

- read-only;
- platform-level data access;
- без write operations.

А `save_progress` — це навпаки:

- write operation;
- domain-specific action;
- зміна стану системи.

Тому це має бути **окремий domain tool**, і це правильно, що він не змішується з `database_query`.

---

## 11. Як це виглядає в agent flow

```text
Користувач каже, що завершив урок
  ↓
Education agent розуміє, що треба зафіксувати прогрес
  ↓
LLM викликає save_progress(user_id, course_id, lesson_id)
  ↓
tool_execution_service запускає execute_save_progress(...)
  ↓
tool або:
  - зараз: повертає stub success message
  - пізніше: звертається в backend і реально зберігає прогрес
  ↓
Agent отримує observation
  ↓
Agent продовжує діалог або підтверджує збереження користувачу
```

---

## 12. Guardrails

`save_progress` уже вважається чутливим tool.

Він входить у:

- `REQUIRES_HUMAN_CONFIRMATION`

у
[tool_guardrails.py](/Users/sofia_prutskya/Documents/УНІВЕРСИТЕТИ/НаУКМА/AI-DIversssss/apps/agent-service/app/tools/tool_guardrails.py)

Чому:

- він має side effect;
- він змінює системні дані;
- його не варто трактувати як простий read-only tool.

Важливий нюанс:
список confirmation-required tools у вас уже є, але повний runtime pause-flow для них ще не доведений до кінця.

---

## 13. Що означає "safe progress"

Швидше за все, ти мала на увазі саме `save_progress`.

`safe progress` як окремого tool у вас немає.

Є:

- `save_progress`

І його сенс — **зберегти прогрес**, а не “безпечний прогрес”.

---

## 14. Поточний чесний стан

Стан на зараз такий:

- tool існує;
- schema існує;
- tool видимий агенту;
- у use cases він уже врахований;
- але реального запису в БД ще немає.

Тобто це підготовлена точка інтеграції, а не завершена persistence-функція.

---

## 15. Короткий висновок

`save_progress` потрібен для того, щоб education-agent міг **фіксувати навчальний прогрес користувача**.

Зараз він:

- валідовує args;
- повертає stub success response;
- ще не записує нічого в базу.

У фінальній архітектурі він має:

- ходити в backend;
- backend має зберігати прогрес у БД;
- а Python agent-service має лишатися лише runtime-шаром, який викликає цю дію.
