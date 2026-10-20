-- K-116 · Giriş sistemi e-postaları (Supabase Auth şablonlarının yerine). {{link}} tek kullanımlık bağlantıdır
-- (core/auth/authFlow.ts). Yönetim panelinden düzenlenebilir; var olan anahtar EZİLMEZ.
SET NAMES utf8mb4;

INSERT INTO email_templates (`key`, name, subject, body, variables) VALUES
('auth.recovery', 'Şifre sıfırlama',
 '{"tr": "Şifre sıfırlama bağlantınız", "en": "Your password reset link"}',
 '{"tr": "Merhaba,\\n\\nHesabınız için şifre sıfırlama isteği aldık. Yeni şifrenizi belirlemek için bağlantıyı açın:\\n\\n{{link}}\\n\\nBağlantı 60 dakika geçerlidir ve bir kez kullanılabilir. İsteği siz yapmadıysanız bu e-postayı dikkate almayın; şifreniz değişmez.\\n\\nCLK Yapı Group", "en": "Hello,\\n\\nWe received a request to reset the password for your account. Open the link to set a new password:\\n\\n{{link}}\\n\\nThe link is valid for 60 minutes and can be used once. If you did not make this request, ignore this e-mail; your password stays the same.\\n\\nCLK Yapı Group"}',
 '["link"]'),
('auth.invite', 'Hesap daveti',
 '{"tr": "CLK Yapı Group hesabınız açıldı", "en": "Your CLK Yapı Group account has been created"}',
 '{"tr": "Merhaba,\\n\\nCLK Yapı Group sitesinde sizin için bir hesap açıldı. Daveti kabul edip şifrenizi belirlemek için bağlantıyı açın:\\n\\n{{link}}\\n\\nBağlantı 7 gün geçerlidir ve bir kez kullanılabilir. Bu daveti beklemiyorsanız e-postayı dikkate almayın.\\n\\nCLK Yapı Group", "en": "Hello,\\n\\nAn account has been created for you on the CLK Yapı Group website. Open the link to accept the invitation and set your password:\\n\\n{{link}}\\n\\nThe link is valid for 7 days and can be used once. If you were not expecting this invitation, ignore this e-mail.\\n\\nCLK Yapı Group"}',
 '["link"]'),
('auth.signup', 'Üyelik doğrulama',
 '{"tr": "E-posta adresinizi doğrulayın", "en": "Verify your e-mail address"}',
 '{"tr": "Merhaba,\\n\\nCLK Yapı Group sitesinde bu adresle üyelik oluşturuldu. Üyeliği etkinleştirmek için bağlantıyı açın:\\n\\n{{link}}\\n\\nBağlantı 24 saat geçerlidir ve bir kez kullanılabilir. Üyeliği siz oluşturmadıysanız bu e-postayı dikkate almayın; hesap etkinleşmez.\\n\\nCLK Yapı Group", "en": "Hello,\\n\\nAn account was registered with this address on the CLK Yapı Group website. Open the link to activate it:\\n\\n{{link}}\\n\\nThe link is valid for 24 hours and can be used once. If you did not register, ignore this e-mail; the account will not be activated.\\n\\nCLK Yapı Group"}',
 '["link"]'),
('auth.email_change', 'E-posta değişikliği onayı',
 '{"tr": "Yeni e-posta adresinizi doğrulayın", "en": "Verify your new e-mail address"}',
 '{"tr": "Merhaba,\\n\\nCLK Yapı Group hesabınızın e-posta adresini bu adresle değiştirme isteği aldık. Değişikliği onaylamak için bağlantıyı açın:\\n\\n{{link}}\\n\\nBağlantı 24 saat geçerlidir ve bir kez kullanılabilir. Onaylanana kadar hesabınız eski adresle çalışır. İsteği siz yapmadıysanız bu e-postayı dikkate almayın.\\n\\nCLK Yapı Group", "en": "Hello,\\n\\nWe received a request to change the e-mail address of your CLK Yapı Group account to this address. Open the link to confirm:\\n\\n{{link}}\\n\\nThe link is valid for 24 hours and can be used once. Until you confirm, your account keeps the old address. If you did not make this request, ignore this e-mail.\\n\\nCLK Yapı Group"}',
 '["link"]')
ON DUPLICATE KEY UPDATE `key` = `key`;
