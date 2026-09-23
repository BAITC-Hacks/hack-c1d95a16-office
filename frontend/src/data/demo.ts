import type { CityData } from '../types';

// UI fixtures only. Not organizer data, and not a simulation or score model.
export const demoData: CityData = {
  datasetVersion: 'ui-demo-v1', cityName: 'Астана', budget: 100, budgetUnit: 'бірлік',
  districts: [
    { id: 'demo-center', name: 'Орталық аймақ', description: 'Қозғалысы қарқынды қалалық орта', population: 42000,
      metrics: [{ label: 'Көлік жүктемесі', value: 72, unit: '%' }, { label: 'Жасыл аумақ үлесі', value: 24, unit: '%' }, { label: 'Қызмет сапасы', value: 58, unit: '/100' }] },
    { id: 'demo-north', name: 'Солтүстік аймақ', description: 'Инфрақұрылымы дамып келе жатқан аймақ', population: 28000,
      metrics: [{ label: 'Көлік жүктемесі', value: 48, unit: '%' }, { label: 'Жасыл аумақ үлесі', value: 36, unit: '%' }, { label: 'Қызмет сапасы', value: 45, unit: '/100' }] },
    { id: 'demo-river', name: 'Жағалау аймағы', description: 'Демалыс пен қоғамдық кеңістіктер', population: 19000,
      metrics: [{ label: 'Көлік жүктемесі', value: 41, unit: '%' }, { label: 'Жасыл аумақ үлесі', value: 52, unit: '%' }, { label: 'Қызмет сапасы', value: 64, unit: '/100' }] },
  ],
  actions: [
    { id: 't1', category: 'transport', title: 'Ыңғайлы аялдамалар', description: 'Аялдама кеңістіктерін жаңарту', cost: 12 },
    { id: 't2', category: 'transport', title: 'Ақылды бағдаршамдар', description: 'Қозғалысты үйлестіруге арналған шара', cost: 24 },
    { id: 't3', category: 'transport', title: 'Қоғамдық көлік желісі', description: 'Көлік қолжетімділігін кеңейту', cost: 38 },
    { id: 'g1', category: 'green', title: 'Ауладағы жасыл кеңістік', description: 'Шағын аумақтарды көгалдандыру', cost: 8 },
    { id: 'g2', category: 'green', title: 'Жасыл жаяу жол', description: 'Көлеңкелі жаяу бағыт қалыптастыру', cost: 16 },
    { id: 'g3', category: 'green', title: 'Аудан саябағы', description: 'Қоғамдық демалыс аумағын дамыту', cost: 26 },
    { id: 's1', category: 'social', title: 'Қоғамдық үйірмелер', description: 'Тұрғындарға арналған ортақ кеңістік', cost: 14 },
    { id: 's2', category: 'social', title: 'Әлеуметтік орталық', description: 'Әлеуметтік қызметке қолжетімділік', cost: 25 },
    { id: 's3', category: 'social', title: 'Білім беру кеңістігі', description: 'Оқу инфрақұрылымын дамыту', cost: 36 },
    { id: 'p1', category: 'safety', title: 'Қауіпсіз өткелдер', description: 'Жаяу жүргіншілерге арналған шара', cost: 9 },
    { id: 'p2', category: 'safety', title: 'Жарық көшелер', description: 'Қоғамдық орындарды жарықтандыру', cost: 18 },
    { id: 'p3', category: 'safety', title: 'Қауіпсіз орта', description: 'Аудан қауіпсіздігіне кешенді шара', cost: 29 },
    { id: 'c1', category: 'services', title: 'Тұрғындармен байланыс', description: 'Өтініштерді қабылдауды жақсарту', cost: 6 },
    { id: 'c2', category: 'services', title: 'Жедел қалалық сервис', description: 'Қызмет көрсетуді ұйымдастыру', cost: 12 },
    { id: 'c3', category: 'services', title: 'Бірыңғай қызмет орталығы', description: 'Қалалық қызметтерді біріктіру', cost: 20 },
  ],
};
