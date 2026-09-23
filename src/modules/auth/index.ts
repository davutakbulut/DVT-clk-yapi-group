export { AccountMenu } from './components/site/AccountMenu';
export { AuthForm, type FieldSpec } from './components/site/AuthForm';
// Server Action'lar buradan DEĞİL '@/modules/auth/actions' üzerinden alınır (K-51: barrel üretimde referansı düşürür).
// Form durumu ve hata anahtarları: diğer modüllerin (hesabım, K-103) aynı sözleşmeyi kullanması için
export { INITIAL_STATE, fieldErrorsFrom, type AuthErrorKey, type AuthFormState } from './domain/schemas';
