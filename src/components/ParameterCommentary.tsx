import React from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Info,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';
import { ParameterTrend } from '../types';

interface ParameterCommentaryProps {
  trend: ParameterTrend;
  reportCount: number;
}

export const ParameterCommentary: React.FC<ParameterCommentaryProps> = ({
  trend,
  reportCount,
}) => {
  const measuredPoints = trend.dataPoints.filter((p) => p.value !== null && p.value !== undefined && p.value > 0);
  const latestPoint = measuredPoints.length > 0 ? measuredPoints[measuredPoints.length - 1] : trend.dataPoints[trend.dataPoints.length - 1];
  const firstPoint = measuredPoints.length > 0 ? measuredPoints[0] : trend.dataPoints[0];
  const hasMultiplePoints = measuredPoints.length > 1;

  // Derive specialized, deep clinical commentary based on parameter identity & status
  const getClinicalInterpretation = () => {
    const name = trend.name.toLowerCase();
    const val = trend.latestValue;
    const isNormal = trend.latestStatus === 'normal';
    const isHigh = trend.latestStatus === 'high' || trend.latestStatus === 'critical';
    const isLow = trend.latestStatus === 'low';

    let organSystem = 'Opšti metabolizam i homeostaza';
    let contextNote = '';
    let recommendation = '';
    let doctorQuestions = [
      `Koliko često je preporučljivo kontrolisati ${trend.name}?`,
      'Koje promene u ishrani i stilu života mogu pomoći u dugoročnoj optimizaciji ovog parametra?',
    ];

    // 1. HDL Holesterol (Protektivni marker - posebna klinička pravila)
    if (name.includes('hdl') && !name.includes('non') && !name.includes('vldl')) {
      organSystem = 'Ateroprotekcija i kardiovaskularni sistem';
      contextNote =
        'HDL ("dobar holesterol") deluje kao zaštitnik krvnih sudova: prikuplja višak holesterola iz perifernih tkiva i arterijskih zidova i transportuje ga u jetru na eliminaciju (reverzni transport holesterola).';
      if (isLow) {
        recommendation =
          'Vrednost HDL-a je ispod preporučene zaštitne granice (> 1.03 mmol/L za muškarce, > 1.20 mmol/L za žene). Snižen HDL predstavlja nezavisan faktor rizika za aterosklerozu čak i kada je ukupni holesterol umeren. Savetuje se redovna umerena aerobna fizička aktivnost (30-45 min brzog hoda ili plivanja dnevno), unos mononezasićenih masti (maslinovo ulje, bademi) i omega-3 masnih kiselina (plava riba).';
        doctorQuestions.push('Da li je uputno uraditi dopler krvnih sudova vrata (ultrazvuk karotida) radi procene stanja zida arterija?');
        doctorQuestions.push('Koji nivo fizičkog opterećenja je najbezbedniji i najefikasniji za podizanje mog HDL nivoa?');
      } else {
        recommendation =
          'Vrednost HDL holesterola je unutar željenih granica i obezbeđuje snažan ateroprotektivni štit za kardiovaskularni sistem. Nastavite sa redovnom fizičkom aktivnošću i zdravom mediteranskom ishranom.';
      }
    }
    // 2. LDL Holesterol
    else if (name.includes('ldl') && !name.includes('vldl')) {
      organSystem = 'Aterogene čestice i kardiovaskularni rizik';
      contextNote =
        'LDL ("loš holesterol") je glavni nosilac lipida koji prodiru u intimu krvnih sudova, gde podležu oksidaciji i pokreću formiranje aterosklerotskih plakova.';
      if (isHigh) {
        recommendation =
          'Vrednost LDL-a premašuje poželjnu granicu (< 3.30 mmol/L za opštu populaciju; kod osoba sa kardiovaskularnim faktorima rizika cilj je često < 2.6 ili < 1.8 mmol/L). Preporučuje se smanjenje unosa zasićenih i industrijskih trans-masti, povećanje rastvorljivih biljnih vlakana (ovsene mekinje, pasulj, jabuke) i kontrola za 6-8 nedelja.';
        doctorQuestions.push('Koja je moja individualna ciljna vrednost LDL holesterola prema SCORE tabeli kardiovaskularnog rizika?');
        doctorQuestions.push('Da li je pre uvođenja statina opravdan tromesečni probni period striktne dijete?');
      } else {
        recommendation =
          'Nivo LDL holesterola se nalazi u optimalnom rasponu, što smanjuje sklonost ka formiranju novih aterogenih naslaga u krvnim sudovima.';
      }
    }
    // 3. Non-HDL Holesterol
    else if (name.includes('non-hdl') || name.includes('ne-hdl')) {
      organSystem = 'Ukupni aterogeni lipidni teret';
      contextNote =
        'Non-HDL holesterol obuhvata sve potencijalno aterogene frakcije (LDL + VLDL + IDL). Prema savremenim kardiološkim vodičima, često je precizniji marker rizika od samog LDL-a, posebno kod osoba sa povišenim trigliceridima.';
      if (isHigh) {
        recommendation =
          'Povišen Non-HDL holesterol (> 3.80 mmol/L) ukazuje na pojačan protok aterogenih čestica (ApoB). Preporučuje se sveobuhvatna korekcija ishrane i redukcija viška telesne mase.';
        doctorQuestions.push('Da li je potrebno odrediti Apolipoprotein B (ApoB) za još precizniju procenu rizika?');
      } else {
        recommendation = 'Non-HDL holesterol je unutar poželjnih granica.';
      }
    }
    // 4. Trigliceridi
    else if (name.includes('triglic')) {
      organSystem = 'Energetski metabolizam i deponovanje masti';
      contextNote =
        'Trigliceridi su primarni oblik deponovane energije u telu. Njihov nivo u krvi je izrazito osetljiv na unos jednostavnih šećera, alkohola, zasićenih masti i kalorijski višak.';
      if (isHigh) {
        recommendation =
          'Povišeni trigliceridi (> 1.70 mmol/L) su čest znak metaboličkog sindroma, masne jetre ili viška prostih ugljenih hidrata u ishrani. Preporučuje se potpuna eliminacija zaslađenih napitaka, alkohola i belog brašna, uz redukciju večernjeg unosa ugljenih hidrata.';
        doctorQuestions.push('Da li je opravdano proveriti insulinsku rezistenciju (HOMA indeks) i ultrazvuk abdomena?');
      } else {
        recommendation =
          'Trigliceridi su u optimalnom fiziološkom opsegu, što ukazuje na dobru metaboličku ravnotežu unosa i potrošnje energije.';
      }
    }
    // 5. Indeks ateroskleroze (IA = LDL/HDL) i Faktor rizika (FR = Ukupni/HDL)
    else if (name.includes('indeks') || name.includes('faktor')) {
      organSystem = 'Rizik od ateroskleroze i vaskularni indeksi';
      contextNote =
        'Lipidni indeksi mere relativni balans između aterogenih (štetnih) i ateroprotektivnih (korisnih) frakcija. Odnos je često klinički informativniji od izolovanih vrednosti.';
      if (isHigh) {
        recommendation =
          'Indeks je iznad poželjne referentne granice, što znači da je udeo štetnih lipida u odnosu na zaštitni HDL nesrazmeran. Prioritet je povećanje nivoa HDL-a i redukcija aterogenih frakcija.';
        doctorQuestions.push('Kako ovaj indeks utiče na moj dugoročni 10-godišnji kardiovaskularni rizik?');
      } else {
        recommendation =
          'Vaskularni odnos je u fiziološki povoljnoj zoni, sa adekvatnom prevagom protektivnih faktora.';
      }
    }
    // 6. Ukupni Holesterol
    else if (name.includes('holesterol') && !name.includes('hdl') && !name.includes('ldl')) {
      organSystem = 'Lipidni profil i kardiovaskularni sistem';
      contextNote =
        'Ukupni holesterol predstavlja sumu svih frakcija u krvi (HDL + LDL + VLDL). Sam po sebi pruža opšti uvid, ali ga uvek treba tumačiti u kontekstu odnosa sa HDL holesterolom.';
      if (isHigh) {
        recommendation =
          'Povišen ukupni holesterol zahteva procenu pojedinačnih frakcija (HDL, LDL, trigliceridi) i lipidnih indeksa. Savetuje se ishrana bogata mononezasićenim mastima i povrćem uz redovnu kontrolu.';
        doctorQuestions.push('Kakav je odnos mog ukupnog i zaštitnog HDL holesterola?');
      } else {
        recommendation = 'Ukupni nivo holesterola je u referentnim granicama.';
      }
    }
    // 7. Glukoza i HbA1c
    else if (name.includes('glukoz') || name.includes('secer') || name.includes('hba1c')) {
      organSystem = 'Metabolizam ugljenih hidrata i pankreas';
      contextNote =
        'Glukoza u krvi je primarni izvor energije za mozak i ćelije. Njen nivo precizno regulišu insulin i glukagon.';
      if (isHigh) {
        recommendation =
          'Izmerena vrednost glukoze natašte je iznad referentne granice (> 6.10 mmol/L). Ako je vrednost između 5.6 i 6.9, reč je o oštećenoj glikemiji natašte (predijabetes). Preporučuje se provera HbA1c (tromesečnog proseka šećera) i po potrebi oralni test opterećenja glukozom (OGTT).';
        doctorQuestions.push('Da li je potrebno uraditi OGTT test sa određivanjem insulina?');
        doctorQuestions.push('Koliki je moj HbA1c (tromesečni šećer)?');
      } else if (isLow) {
        recommendation =
          'Vrednost je ispod referentnog minimuma (hipoglikemija). Obratite pažnju na eventualne simptome kao što su drhtavica, znojenje, slabost ili vrtoglavica.';
      } else {
        recommendation =
          'Glukoza je u referentnom opsegu, što ukazuje na urednu bazalnu glikoregulaciju i osetljivost na insulin.';
      }
    }
    // 8. Enzimi jetre (AST, ALT, GGT, ALP, Bilirubin)
    else if (
      name.includes('alt') ||
      name.includes('ast') ||
      name.includes('ggt') ||
      name.includes('alp') ||
      name.includes('bilirubin')
    ) {
      organSystem = 'Funkcija jetre i hepatobilijarni trakt';
      contextNote =
        'Enzimi jetre (transaminaze AST i ALT, kao i GGT) su intracelularni proteini. Njihov porast u serumu signalizira oštećenje ili pojačanu propustljivost membrana ćelija jetre (hepatocita) ili bilijarnih puteva.';
      if (isHigh) {
        recommendation =
          'Povišene vrednosti jetrenih enzima mogu biti posledica steatoze (masne jetre), primene određenih lekova, suplementacije, intenzivnog mišićnog napora ili virusnih infekcija. Preporučuje se pošteda od napornih treninga pre ponovnog vađenja krvi i ultrazvučni pregled abdomena.';
        doctorQuestions.push('Da li je preporučljiv ultrazvuk jetre i žučne kese?');
        doctorQuestions.push('Da li neki od lekova ili suplemenata koje uzimam može uticati na ove enzime?');
      } else {
        recommendation =
          'Enzimska aktivnost je u potpunosti unutar referentnih intervala, bez znakova citolize jetrenih ćelija ili bilijarne staze.';
      }
    }
    // 9. Bubrežna funkcija (Kreatinin, Urea, Mokraćna kiselina)
    else if (name.includes('kreatinin') || name.includes('urea') || name.includes('mokracna')) {
      organSystem = 'Bubrežna funkcija i eliminacija raspadnih produkata';
      contextNote =
        'Kreatinin je nusprodukt mišićnog metabolizma, a urea metabolizma proteina. Obe supstance se filtriraju kroz glomerule bubrega, te su ključni pokazatelji brzine glomerularne filtracije (eGFR) i hidracije.';
      if (isHigh) {
        recommendation =
          'Povišene vrednosti mogu ukazivati na smanjenu filtracionu moć bubrega, ali i na dehidraciju ili visok unos proteina i intenzivan trening. Obezbedite optimalan unos tečnosti (2-2.5L vode dnevno) i ponovite nalaz.';
        doctorQuestions.push('Kolika je moja procenjena brzina glomerularne filtracije (eGFR)?');
        doctorQuestions.push('Da li treba korigovati unos proteina ili lekova koji se izlučuju bubrezima?');
      } else {
        recommendation =
          'Nivoi azotnih materija su u fiziološkim granicama, što potvrđuje očuvanu ekskretornu i filtracionu funkciju bubrega.';
      }
    }
    // 10. Zapaljenski markeri (CRP, Sedimentacija, Leukociti)
    else if (
      name.includes('crp') ||
      name.includes('sedimentacij') ||
      name.includes('se ') ||
      name.includes('leukocit')
    ) {
      organSystem = 'Imunski odgovor i inflamacija';
      contextNote =
        'CRP je protein akutne faze koji jetra sintetiše u roku od nekoliko sati od pojave upale ili infekcije. Sedimentacija (SE) i leukociti (WBC) prate tok inflamatornog odgovora.';
      if (isHigh) {
        recommendation =
          'Povišene vrednosti ukazuju na aktivan inflamatorni proces, bakterijsku ili virusnu reakciju, ili tkivno oštećenje. Savetuje se kontrola uz uvid lekara i diferencijalnu krvnu sliku.';
        doctorQuestions.push('Da li je potrebno uraditi leukocitarnu formulu ili mikrobiološke analize?');
      } else {
        recommendation =
          'Nema laboratorijskih znakova akutne sistemske upale ili infekcije.';
      }
    }
    // 11. Crvena krvna loza i gvožđe (Hemoglobin, Eritrociti, Hematokrit, Gvožđe, Feritin)
    else if (
      name.includes('hemoglobin') ||
      name.includes('eritrocit') ||
      name.includes('hematokrit') ||
      name.includes('gvozd') ||
      name.includes('fe') ||
      name.includes('feritin')
    ) {
      organSystem = 'Transport kiseonika i zalihe gvožđa';
      contextNote =
        'Hemoglobin u eritrocitima vezuje i prenosi kiseonik iz pluća u sve organe i mišiće. Njegov nivo direktno zavisi od raspoloživog gvožđa i koštane srži.';
      if (isLow) {
        recommendation =
          'Snižene vrednosti ukazuju na mogućnost sideropenijske ili druge anemije. Preporučuje se određivanje feritina (stvarnih depoa gvožđa) i konsultacija u vezi sa ishranom bogatom hem-gvožđem.';
        doctorQuestions.push('Da li je potrebno proveriti nivo feritina, TIBC i UIBC?');
      } else if (isHigh) {
        recommendation =
          'Blago povišene vrednosti mogu biti znak dehidracije, boravka na većim nadmorskim visinama ili reaktivne poliglobulije.';
      } else {
        recommendation =
          'Crvena krvna loza je u urednom fiziološkom balansu, obezbeđujući adekvatnu oksigenaciju svih tkiva.';
      }
    }
    // 12. Trombociti
    else if (name.includes('trombocit') || name.includes('plt')) {
      organSystem = 'Hemostaza i koagulacija krvi';
      contextNote =
        'Trombociti (krvne pločice) su ključni elementi u formiranju ugruška i zaustavljanju krvarenja.';
      if (isHigh) {
        recommendation =
          'Trombocitoza može biti reaktivna (nakon infekcije, upale ili napora). Preporučuje se praćenje.';
      } else if (isLow) {
        recommendation =
          'Trombocitopenija zahteva kontrolni nalaz i pažnju na eventualnu pojavu modrica ili krvarenja desni.';
        doctorQuestions.push('Da li je potrebno ponoviti trombocite iz citratne epruvete (isključivanje pseudotrombocitopenije)?');
      } else {
        recommendation = 'Broj trombocita je u granicama normale, što ukazuje na urednu primarnu hemostazu.';
      }
    }
    // 13. Elektroliti i minerali (Kalijum, Natrijum, Kalcijum, Magnezijum)
    else if (
      name.includes('kalijum') ||
      name.includes('natrijum') ||
      name.includes('kalcijum') ||
      name.includes('magnezijum')
    ) {
      organSystem = 'Elektrolitni balans i neuromišićna ekscitabilnost';
      contextNote =
        'Elektroliti održavaju osmotski pritisak, acidobaznu ravnotežu, provođenje nervnih impulsa i ritmički rad srčanog mišića.';
      if (isHigh || isLow) {
        recommendation =
          'Odstupanja elektrolita zahtevaju pažnju jer direktno utiču na srčani ritam, mišićne kontrakcije i krvni pritisak. Konsultujte lekara radi provere terapije (diuretici, antihipertenzivi).';
        doctorQuestions.push('Da li moji lekovi ili suplementi mogu uticati na nivoe elektrolita?');
      } else {
        recommendation = 'Elektrolitni status je stabilan i u optimalnom fiziološkom balansu.';
      }
    }
    // 14. Hormoni štitaste žlezde (TSH, FT4, FT3)
    else if (name.includes('tsh') || name.includes('ft4') || name.includes('ft3')) {
      organSystem = 'Endokrini sistem i tiroidna osovina';
      contextNote =
        'Tiroidni hormoni upravljaju bazalnim metabolizmom, termogenezom, potrošnjom kiseonika i radom kardiovaskularnog sistema.';
      if (isHigh || isLow) {
        recommendation =
          'Odstupanje TSH ili slobodnih tiroidnih hormona ukazuje na potrebu endokrinološke evaluacije (hipotireoza ili hipertireoza).';
        doctorQuestions.push('Da li je potreban ultrazvuk štitaste žlezde i antitela (anti-TPO, anti-TG)?');
      } else {
        recommendation = 'Tiroidni hormoni pokazuju urednu funkciju osovine hipofiza-štitasta žlezda.';
      }
    }
    // 15. Opšti fallback
    else {
      contextNote = `Laboratorijski parametar ${trend.name} u okviru kategorije ${trend.category}.`;
      recommendation = isNormal
        ? 'Vrednost se nalazi unutar očekivanih referentnih granica.'
        : 'Zabeleženo je odstupanje od referentnog raspona, preporučuje se konsultacija sa ordinirajućim lekarom.';
    }

    return { organSystem, contextNote, recommendation, doctorQuestions };
  };

  const { organSystem, contextNote, recommendation, doctorQuestions } =
    getClinicalInterpretation();

  const isFavorableMeaning = trend.trendMeaning === 'improving';
  const isWorseningMeaning = trend.trendMeaning === 'worsening';

  return (
    <div
      id={`commentary-${trend.name.toLowerCase().replace(/\s+/g, '-')}`}
      className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6"
    >
      {/* Header of Commentary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              trend.latestStatus === 'normal'
                ? 'bg-emerald-100 text-emerald-700'
                : trend.latestStatus === 'high'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Lekarska interpretacija i analiza: {trend.name}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  trend.latestStatus === 'normal'
                    ? 'bg-emerald-100 text-emerald-800'
                    : trend.latestStatus === 'high'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {trend.latestStatus === 'normal'
                  ? 'Fiziološki optimalno'
                  : trend.latestStatus === 'high'
                  ? 'Povišena vrednost'
                  : 'Snižena vrednost'}
              </span>

              {trend.trendMeaning && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                    trend.trendMeaning === 'improving'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : trend.trendMeaning === 'worsening'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {trend.trendMeaning === 'improving' && <ShieldCheck className="w-3 h-3 text-teal-600" />}
                  {trend.trendMeaning === 'worsening' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                  {trend.trendMeaning === 'stable' && <Minus className="w-3 h-3 text-slate-500" />}
                  <span>
                    {trend.trendMeaning === 'improving'
                      ? 'Povoljan tok kretanja'
                      : trend.trendMeaning === 'worsening'
                      ? 'Trend zahteva pažnju'
                      : 'Stabilan nivo'}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fokus: <strong className="text-slate-700">{organSystem}</strong> •
              Poslednje merenje: {latestPoint?.formattedDate || trend.latestDate} ({trend.latestValue} {trend.unit})
            </p>
          </div>
        </div>

        {/* Reference Range Chip */}
        <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-right shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Referentni interval
          </span>
          <span className="text-xs font-bold text-slate-800">
            {trend.refText || `${trend.refMin ?? 0} - ${trend.refMax ?? '—'}`} {trend.unit}
          </span>
        </div>
      </div>

      {/* Grid of 3 Clinical Focus Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Hronološko kretanje */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
            {isFavorableMeaning ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : isWorseningMeaning ? (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            ) : (
              <Minus className="w-4 h-4 text-slate-500" />
            )}
            <span>Hronološka trajektorija</span>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed space-y-1.5">
            {hasMultiplePoints ? (
              <>
                <p>
                  Evidentirano kroz{' '}
                  <strong className="text-slate-800 font-bold">
                    {trend.dataPoints.length} uzastopnih laboratorijskih izveštaja
                  </strong>
                  .
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Početno ({firstPoint?.formattedDate || '—'}):</span>
                    <span className="font-semibold text-slate-800">
                      {firstPoint && firstPoint.value !== null ? `${firstPoint.value} ${trend.unit}` : (firstPoint?.textValue || '—')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Poslednje ({latestPoint?.formattedDate || '—'}):</span>
                    <span className="font-bold text-teal-700">
                      {latestPoint && latestPoint.value !== null ? `${latestPoint.value} ${trend.unit}` : (latestPoint?.textValue || '—')}
                    </span>
                  </div>
                  {trend.changePercent !== undefined && Math.abs(trend.changePercent) > 0 && (
                    <div className="flex justify-between border-t border-slate-100 pt-1 font-semibold">
                      <span className="text-slate-500">Ukupna promena:</span>
                      <span className={isFavorableMeaning ? 'text-emerald-600' : isWorseningMeaning ? 'text-rose-600' : 'text-slate-700'}>
                        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p>
                Trenutno je dostupno jedno laboratorijsko merenje od datuma {latestPoint?.formattedDate || trend.latestDate}.
                Uvozom dodatnih nalaza sa OneDrive-a ili skenera, ovde će se automatski iscrtati višegodišnji komparativni trend.
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Medicinski kontekst */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
            <Info className="w-4 h-4 text-sky-600" />
            <span>Fiziološki i klinički značaj</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {contextNote}
          </p>
        </div>

        {/* Card 3: Preporuka i status */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
            {trend.latestStatus === 'normal' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
            <span>Preporuka za pacijenta</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {recommendation}
          </p>
        </div>
      </div>

      {/* Suggested Questions for Doctor */}
      <div className="bg-teal-50/70 rounded-2xl p-4 sm:p-5 border border-teal-200/80 space-y-2.5">
        <div className="flex items-center gap-2 text-teal-900 font-bold text-xs sm:text-sm">
          <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Predlog ciljanih tema za razgovor sa Vašim lekarom:</span>
        </div>
        <ul className="space-y-1.5 pl-6 list-disc text-xs text-teal-950">
          {doctorQuestions.map((q, i) => (
            <li key={i} className="leading-relaxed">
              {q}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
