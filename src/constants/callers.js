const BASE = import.meta.env.BASE_URL;

export const CALLERS = {
  female: [
    { name: '내 사랑 ❤️', audio: `${BASE}audio/male_1.mp3`, image: `${BASE}images/male_1.jpg` },
    { name: '오빠',        audio: `${BASE}audio/male_2.mp3`, image: `${BASE}images/male_2.jpg` },
    { name: '민수',        audio: `${BASE}audio/male_3.mp3`, image: `${BASE}images/male_3.jpg` },
    { name: '서준이',      audio: `${BASE}audio/male_4.mp3`, image: `${BASE}images/male_4.jpg` },
    { name: '도윤이',      audio: `${BASE}audio/male_5.mp3`, image: `${BASE}images/male_5.jpg` },
  ],
  male: [
    { name: '지연이',         audio: `${BASE}audio/female_1.mp3`, image: `${BASE}images/female_1.jpg` },
    { name: '수진이',         audio: `${BASE}audio/female_2.mp3`, image: `${BASE}images/female_2.jpg` },
    { name: '우리 공주님 👸', audio: `${BASE}audio/female_3.mp3`, image: `${BASE}images/female_3.jpg` },
    { name: '하은이',         audio: `${BASE}audio/female_4.mp3`, image: `${BASE}images/female_4.jpg` },
    { name: '서연이',         audio: `${BASE}audio/female_5.mp3`, image: `${BASE}images/female_5.jpg` },
  ],
};

export const INSTAGRAM_URL =
  'https://www.instagram.com/mju_humanrights?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';
