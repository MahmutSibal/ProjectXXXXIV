/**
 * Türkçe metin yardımcıları.
 *
 * JavaScript'in varsayılan toLowerCase()/toUpperCase() işlevleri İngilizce
 * kurallarına göre çalışır ve Türkçede yanlış sonuç verir:
 *   'I'.toLowerCase()  -> 'i'   (doğrusu 'ı')
 *   'i'.toUpperCase()  -> 'I'   (doğrusu 'İ')
 *
 * Bu yüzden aramada "ısparta" yazan kullanıcı "Isparta" kaydını bulamıyordu.
 */

/** Türkçe kurallarına göre küçük harf. */
export const toLowerTr = (value) => String(value ?? '').toLocaleLowerCase('tr');

/** Türkçe kurallarına göre büyük harf. */
export const toUpperTr = (value) => String(value ?? '').toLocaleUpperCase('tr');

/**
 * Aramada karşılaştırma için metni sadeleştirir.
 *
 * Türkçe karakterleri ASCII karşılıklarına indirger; böylece kullanıcı
 * "sukran" yazarak "Şükran"ı, "gunes" yazarak "Güneş"i bulabilir.
 * Klavye düzeni ya da acele nedeniyle şapkasız yazmak çok yaygındır.
 */
export function normalizeForSearch(value) {
  return toLowerTr(value)
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .trim();
}

/**
 * Arama kutusu eşleşmesi. İki taraf da sadeleştirilerek karşılaştırılır.
 * Arama terimi boşsa her kayıt eşleşir.
 */
export function matchesSearch(haystack, needle) {
  const term = normalizeForSearch(needle);
  if (!term) return true;
  return normalizeForSearch(haystack).includes(term);
}
