export const LESSONS = [
  {
    id: 'en-2-u2',
    grade: 2,
    unit: 2,
    title: 'Unit 2: In the backyard',
    vocab: [
      { word: 'tree', ipa: '/triː/', meaning: 'cây' },
      { word: 'flower', ipa: '/ˈflaʊər/', meaning: 'hoa' },
      { word: 'grass', ipa: '/ɡrɑːs/', meaning: 'cỏ' },
      { word: 'bird', ipa: '/bɜːd/', meaning: 'chim' },
    ],
    sentences: [
      { text: 'I can see a tree.', ipa: '/aɪ kæn siː ə triː/', meaning: 'Mình có thể nhìn thấy một cái cây.' },
      { text: 'I can see a flower.', ipa: '/aɪ kæn siː ə ˈflaʊər/', meaning: 'Mình nhìn thấy một bông hoa.' },
      { text: 'The bird is in the tree.', ipa: '/ðə bɜːd ɪz ɪn ðə triː/', meaning: 'Con chim ở trên cây.' },
    ],
  },
  {
    id: 'en-2-u3',
    grade: 2,
    unit: 3,
    title: 'Unit 3: At the seaside',
    vocab: [
      { word: 'sea', ipa: '/siː/', meaning: 'biển' },
      { word: 'sand', ipa: '/sænd/', meaning: 'cát' },
      { word: 'sail', ipa: '/seɪl/', meaning: 'cánh buồm' },
      { word: 'sun', ipa: '/sʌn/', meaning: 'mặt trời' },
    ],
    sentences: [
      { text: 'I can see the sea.', ipa: '/aɪ kæn siː ðə siː/', meaning: 'Mình có thể nhìn thấy biển.' },
      { text: 'I can see the sun.', ipa: '/aɪ kæn siː ðə sʌn/', meaning: 'Mình nhìn thấy mặt trời.' },
      { text: "I'm playing in the sand.", ipa: '/aɪm ˈpleɪɪŋ ɪn ðə sænd/', meaning: 'Mình đang chơi cát.' },
    ],
  },
  {
    id: 'en-2-u4',
    grade: 2,
    unit: 4,
    title: 'Unit 4: In the countryside',
    vocab: [
      { word: 'field', ipa: '/fiːld/', meaning: 'cánh đồng' },
      { word: 'river', ipa: '/ˈrɪvər/', meaning: 'dòng sông' },
      { word: 'hill', ipa: '/hɪl/', meaning: 'đồi' },
      { word: 'farm', ipa: '/fɑːm/', meaning: 'nông trại' },
    ],
    sentences: [
      { text: 'I can see a river.', ipa: '/aɪ kæn siː ə ˈrɪvər/', meaning: 'Mình có thể nhìn thấy một dòng sông.' },
      { text: 'I can see a hill.', ipa: '/aɪ kæn siː ə hɪl/', meaning: 'Mình nhìn thấy một ngọn đồi.' },
      { text: 'The farm is in the countryside.', ipa: '/ðə fɑːm ɪz ɪn ðə ˈkʌntrisaɪd/', meaning: 'Nông trại ở miền quê.' },
    ],
  },
];

export function findLesson(lessons, id) {
  return lessons.find((lesson) => lesson.id === id) ?? lessons[0];
}
