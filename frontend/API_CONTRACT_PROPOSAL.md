# Member 2-ге: API құрылымы бойынша ұсыныс

**Мәртебесі: келісілмеген ұсыныс. Төмендегі құрылымдар нақты сервер API-інің сипаттамасы емес. Endpoint атаулары әдейі бекітілмеген.**

## Келісу қажет

1. Backend URL, бастапқы деректер / simulation / analysis маршруттары, HTTP әдістері және авторизация тәртібі қандай?
2. Нақты JSON жауап мысалдары немесе OpenAPI файлы бар ма?
3. Аудан және шара идентификаторлары, бес бағыттың атаулары, бастапқы бюджет пен ақша бірлігі қандай?
4. Бір жоспар бүкіл қалаға ма, әлде бір ауданға ма? Frontend уақытша бір аудан және әр бағыттан бір шара моделін қолданады.
5. Бес шара міндетті ме? Аудандарға шектеу, қайталану, өзара үйлеспейтін шаралар бар ма?
6. Score шкаласы, бастапқы және жаңа мән, метрикалардың өлшемдері мен түсіндірмесі қандай?
7. Simulation жауабы синхронды ма, әлде job/polling керек пе? AI жауабы құрылымды JSON ба, әлде stream бе?
8. CORS ішінде `http://127.0.0.1:5173` және қажет болса `http://localhost:5173` рұқсат етіле ме?

## Ұсынылған бастапқы деректер жауабы

```ts
type Category = 'transport' | 'green' | 'social' | 'safety' | 'services';
type Bootstrap = {
  datasetVersion: string;
  cityName: string;
  budget: number;          // > 0; ең көбі 2 ондық таңба
  budgetUnit: string;
  districts: {
    id: string;
    name: string;
    description: string;
    population?: number;
    metrics: { label: string; value: number; unit: string }[];
  }[];
  actions: {
    id: string;
    category: Category;
    title: string;
    description: string;
    cost: number;          // >= 0; ең көбі 2 ондық таңба
    districtIds?: string[]; // жоқ болса барлық ауданға қолжетімді
  }[];
};
```

ID мәндері бірегей, сандар finite болуы керек. Бос тізімдерде UI «дерек жоқ» күйін көрсетеді. Қазір `src/types.ts` осы форматты тексереді. Нақты API басқа форматта болса, frontend адаптері өзгертіледі.

## Есептеу

Frontend жіберетін ұсынылған POST денесі:

```ts
{ datasetVersion: string; districtId: string; actionIds: string[] }
```

Ұсынылған жауап:

```ts
{
  scenarioId: string;
  datasetVersion: string;
  spent: number;
  remaining: number;
  baselineScore: number;
  projectedScore: number;
  metrics: { label: string; before: number; after: number; unit: string }[];
  assumptions: string[];
}
```

Сервер шаралардың бағасын, рұқсатын, бюджет пен таңдауларды өзі тексереді. Score тек Member 1 есептеуінен келеді. Frontend ешқандай Score жібермейді. `spent + remaining` бастапқы бюджетке тең болуы тиіс.

## AI талдауы

Есептеу сәтті аяқталғаннан кейін пайдаланушы жеке батырмамен сұратады. Ұсынылған POST: `{ scenarioId, datasetVersion }`. Сервер сценарийді өзі алады; браузер жіберген Score-ға сенбейді.

```ts
{
  scenarioId: string;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
}
```

AI мәтіні қазақша, есептелген нәтижелерге сүйенуі керек. Кілттер тек backend-те. Таңдаулар өзгергенде frontend алдыңғы нәтиже мен AI мәтінін жояды және аяқталмаған сұранымды тоқтатады. 30 секундтан ұзақ жұмыс қажет болса, polling/streaming-ті бірге келісеміз.
