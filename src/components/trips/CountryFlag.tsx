import { View, Text, ViewProps } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { cssInterop } from 'react-native-css-interop';
import { getCountryByCode } from '../../constants/countries';

export interface CountryFlagProps extends ViewProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

/** SVG flag data from country-flag-icons (bundled, no network needed) */
const FLAG_SVG: Record<string, string> = {
  JP: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#FFF" d="M0 0h512v342H0z"/><circle fill="#D80027" cx="256.5" cy="171" r="96"/></svg>',
  MY: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#FFF" d="M0 0h513v342H0z"/><g fill="#c00"><path d="M0 0h513v24.4H0zM0 48.9h513v24.4H0zM0 97.7h513v24.4H0zM0 146.6h513V171H0zM0 195.4h513v24.4H0zM0 244.3h513v24.4H0zM0 293.1h513v24.4H0z"/></g><path fill="#006" d="M0 0h256.5v195.4H0z"/><path d="M153.3 42.1C122.6 30.7 88.5 46.3 77.1 77s4.2 64.8 34.9 76.2c13.3 5 28 5 41.4 0-30.7 24.5-75.4 19.6-100-11.1s-19.6-75.4 11.1-100c26-20.7 62.9-20.7 88.8 0zm26.7 75-20.6 23.3 5.4-30.6-31-1.6 27.3-14.9L143 68l28.6 12 8.4-29.9 8.4 29.9L217 68l-18 25.4 27.3 14.9-31 1.6 5.4 30.6-20.7-23.4z" fill="#fc0"/></svg>',
  SG: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 85.333 512 341.333"><path fill="#FFF" d="M0 85.337h512v341.326H0z"/><path fill="#D80027" d="M0 85.337h512V256H0z"/><g fill="#FFF"><path d="M83.478 170.666c0-24.865 17.476-45.637 40.812-50.734a52.059 52.059 0 0 0-11.13-1.208c-28.688 0-51.942 23.254-51.942 51.941s23.255 51.942 51.942 51.942c3.822 0 7.543-.425 11.13-1.208-23.336-5.095-40.812-25.867-40.812-50.733zM150.261 122.435l3.684 11.337h11.921l-9.645 7.007 3.684 11.337-9.644-7.006-9.645 7.006 3.685-11.337-9.645-7.007h11.921z"/><path d="m121.344 144.696 3.683 11.337h11.921l-9.645 7.007 3.684 11.337-9.643-7.006-9.645 7.006 3.685-11.337-9.645-7.007h11.921zM179.178 144.696l3.684 11.337h11.921l-9.645 7.007 3.684 11.337-9.644-7.006-9.644 7.006 3.685-11.337-9.645-7.007h11.921zM168.047 178.087l3.684 11.337h11.921l-9.644 7.007 3.684 11.337-9.645-7.006-9.643 7.006 3.684-11.337-9.644-7.007h11.92zM132.474 178.087l3.683 11.337h11.921l-9.644 7.007 3.684 11.337-9.644-7.006-9.644 7.006 3.684-11.337-9.644-7.007h11.92z"/></g></svg>',
  TH: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 85.333 512 341.333"><path fill="#FFF" d="M0 85.334h512V426.66H0z"/><path fill="#0052B4" d="M0 194.056h512v123.882H0z"/><g fill="#D80027"><path d="M0 85.334h512v54.522H0zM0 372.143h512v54.522H0z"/></g></svg>',
  VN: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 85.333 512 341.333"><path fill="#D80027" d="M196.641 85.337H0v341.326h512V85.337z"/><path fill="#FFDA44" d="m256 157.279 22.663 69.747H352l-59.332 43.106 22.664 69.749L256 296.774l-59.332 43.107 22.664-69.749L160 227.026h73.337z"/></svg>',
  GB: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><g fill="#FFF"><path d="M0 0h513v341.3H0V0z"/><path d="M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6z"/></g><g fill="#012169"><path d="M393.8 230 513 295.7V230H393.8zm-82.1 0L513 341.3v-31.5L369.3 230h-57.6zm146.9 111.3-147-81.7v81.7h147zM90.3 230 0 280.2V230h90.3zm110 14.2v97.2H25.5l174.8-97.2zM118.2 111.3 0 45.6v65.7h118.2zm82.1 0L0 0v31.5l143.7 79.8h56.6zM53.4 0l147 81.7V0h-147zM421.7 111.3 513 61.1v50.2h-91.3zm-110-14.2V0h174.9L311.7 97.1z"/></g><g fill="#c8102e"><path d="M288 0h-64v138.7H0v64h224v138.7h64V202.7h224v-64H288V0z"/><path d="M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM143.7 230 0 309.9v31.5L200.3 230h-56.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6zM368.3 111.3 513 31.5V0L311.7 111.3h56.6z"/></g></svg>',
  US: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#FFF" d="M0 0h513v342H0z"/><g fill="#D80027"><path d="M0 0h513v26.3H0zM0 52.6h513v26.3H0zM0 105.2h513v26.3H0zM0 157.8h513v26.3H0zM0 210.5h513v26.3H0zM0 263.1h513v26.3H0zM0 315.7h513V342H0z"/></g><path fill="#2E52B2" d="M0 0h256.5v184.1H0z"/><path fill="#FFF" d="m47.8 138.9-4-12.8-4.4 12.8H26.2l10.7 7.7-4 12.8 10.9-7.9 10.6 7.9-4.1-12.8 10.9-7.7zM104.1 138.9l-4.1-12.8-4.2 12.8H82.6l10.7 7.7-4 12.8 10.7-7.9 10.8 7.9-4-12.8 10.7-7.7zM160.6 138.9l-4.3-12.8-4 12.8h-13.5l11 7.7-4.2 12.8 10.7-7.9 11 7.9-4.2-12.8 10.7-7.7zM216.8 138.9l-4-12.8-4.2 12.8h-13.3l10.8 7.7-4 12.8 10.7-7.9 10.8 7.9-4.3-12.8 11-7.7z"/></svg>',
  CA: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#FFF" d="M0 0h513v342H0z"/><g fill="red"><path d="M0 0h142v342H0zM371 0h142v342H371zM306.5 206l50.4-25.2-25.2-12.6V143l-50.4 25.2 25.2-50.4h-25.2L256.1 80l-25.2 37.8h-25.2l25.2 50.4-50.4-25.2v25.2l-25.2 12.6 50.4 25.2-12.6 25.2h50.4V269h25.2v-37.8h50.4z"/></g></svg>',
  AU: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#00008b" d="M0 0h513v342H0z"/><g fill="#FFF"><path d="m188 212.6 11 22.9 24.7-5.7-11 22.8 19.9 15.8-24.8 5.6.1 25.4-19.9-15.9-19.8 15.9.1-25.4-24.8-5.6 19.9-15.8-11.1-22.8 24.8 5.7zM385.9 241.1l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.6v12.2l-9.4-7.6-9.5 7.6.1-12.2-11.8-2.6 9.5-7.5-5.3-10.9 11.8 2.7zM337.3 125.1l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.7v12.1l-9.4-7.6-9.5 7.6.1-12.1-11.9-2.7 9.5-7.5-5.3-10.9L332 136zM385.9 58.9l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.7v12.1l-9.4-7.6-9.5 7.6.1-12.1-11.8-2.7 9.5-7.5-5.3-10.9 11.8 2.7zM428.4 108.6l5.2 10.9 11.8-2.7-5.3 10.9 9.5 7.5-11.8 2.6V150l-9.4-7.6-9.5 7.6v-12.2l-11.8-2.6 9.5-7.5-5.3-10.9 11.8 2.7zM398 166.5l4.1 12.7h13.3l-10.8 7.8 4.2 12.7-10.8-7.9-10.8 7.9 4.1-12.7-10.7-7.8h13.3z"/></g><path fill="#012169" d="M0 0h256.5v171H0z"/><g fill="#FFF"><path d="M256.5 0v30.6l-45.3 25.2h45.3v59.4h-59.2l59.2 32.9V171h-26.7l-73.7-40.9V171h-55.7v-48.7L12.8 171H0v-30.6l45.3-25.2H0V55.8h59.2L0 22.9V0h26.7l73.7 40.9V0h55.7v48.7L243.7 0z"/><path d="M156.1 115.2 256.5 171v-15.8l-72-40zM100.4 55.8 0 0v15.8l72 40z"/></g><g fill="red"><path d="M144.3 0h-32.1v69.5H0v32h112.2V171h32.1v-69.5h112.2v-32H144.3z"/><path d="M156.1 115.2 256.5 171v-15.8l-72-40zM72 115.2l-72 40V171l100.4-55.8zM100.4 55.8 0 0v15.8l72 40zM184.5 55.8l72-40V0L156.1 55.8z"/></g></svg>',
  NZ: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#012169" d="M0 0h513v342H0z"/><g fill="#D80027" stroke="#FFF" stroke-width="2"><path d="m448.9 107.7 4.2 13.1h13.8l-11.1 8.1L460 142l-11.1-8.1-11.1 8.1 4.2-13.1-11.1-8.1h13.7zM384.7 253.6l5.1 15.6h16.4l-13.2 9.7 5 15.6-13.3-9.7-13.2 9.7 5-15.6-13.3-9.7h16.5zM384.8 43.4l4.7 14.6h15.3l-12.4 8.9 4.7 14.6-12.3-9-12.4 9 4.7-14.6-12.3-8.9H380zM320.6 129.4l4.7 14.5h15.3l-12.3 9 4.7 14.5-12.4-8.9-12.3 8.9 4.7-14.5-12.4-9h15.3z"/></g><path fill="#012169" d="M0 0h256.5v171H0z"/><g fill="#FFF"><path d="M256.5 0v30.6l-45.3 25.2h45.3v59.4h-59.2l59.2 32.9V171h-26.7l-73.7-40.9V171h-55.7v-48.7L12.8 171H0v-30.6l45.3-25.2H0V55.8h59.2L0 22.9V0h26.7l73.7 40.9V0h55.7v48.7L243.7 0z"/><path d="M156.1 115.2 256.5 171v-15.8l-72-40zM100.4 55.8 0 0v15.8l72 40z"/></g><g fill="#D80027"><path d="M144.3 0h-32.1v69.5H0v32h112.2V171h32.1v-69.5h112.2v-32H144.3z"/><path d="M156.1 115.2 256.5 171v-15.8l-72-40zM72 115.2l-72 40V171l100.4-55.8zM100.4 55.8 0 0v15.8l72 40zM184.5 55.8l72-40V0L156.1 55.8z"/></g></svg>',
  KR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#FFF" d="M0 0h513v342H0z"/><g stroke="#000" stroke-width="14.25"><path d="M84.6 107.8 132 36.6m-29.7 83 47.4-71.1m-29.6 83 47.4-71.1M345.4 281.7l47.4-71.1m-29.6 82.9 47.4-71.1m-29.6 83 47.4-71.1M132 305.4l-47.4-71.1m65.2 59.2-47.4-71.1m65.2 59.3-47.4-71.1M392.8 131.5l-47.4-71.1m65.2 59.2-47.4-71.1m65.2 59.3L381 36.6"/></g><g stroke="#FFF" stroke-width="12.5"><path d="m357.3 238.2 59.3 39.5M117.2 263.9 135 252m222.3-148.2L378 90m17.8-11.9 17.8-11.9"/></g><circle fill="#CA163A" cx="256.5" cy="171" r="85.5"/><path fill="#0E4896" d="M185.3 123.6c-13.1 19.6-7.8 46.2 11.9 59.3s46.2 7.8 59.3-11.9 39.6-24.9 59.3-11.9c19.6 13.1 24.9 39.6 11.9 59.3-26.2 39.3-79.3 49.9-118.6 23.7s-49.9-79.3-23.8-118.5z"/></svg>',
  IN: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#ff6820" d="M0 0h513v114H0V0z"/><path fill="#FFF" d="M0 114h513v114H0V114z"/><path fill="#046a38" d="M0 228h513v114H0V228z"/><circle fill="none" stroke="#07038d" stroke-width="4" cx="256.5" cy="171" r="34.2"/></svg>',
  ID: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 513 342"><path fill="#FFF" d="M0 0h513v342H0z"/><path fill="#E00" d="M0 0h513v171H0z"/></svg>',
  PH: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 85.333 512 341.333"><path fill="#FFF" d="M0 85.337h512v341.326H0z"/><path fill="#0052B4" d="M512 85.337V256H256L0 85.337z"/><path fill="#D80027" d="M512 256v170.663H0L256 256z"/><g fill="#FFDA44"><path d="m161.908 256-27.288-12.835 14.532-26.428-29.632 5.668-3.755-29.933-20.64 22.015-20.639-22.015-3.755 29.933-29.631-5.669 14.531 26.428L28.343 256l27.288 12.835L41.1 295.263l29.633-5.668 3.753 29.933 20.639-22.015 20.64 22.015 3.755-29.933 29.631 5.669-14.532-26.427z"/></g></svg>',
};

/** Map ISO 3166-1 alpha-3 (our format) to alpha-2 (for flag lookup) */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  JPN: 'JP', MYS: 'MY', SGP: 'SG', THA: 'TH', VNM: 'VN',
  GBR: 'GB', USA: 'US', CAN: 'CA', AUS: 'AU', NZL: 'NZ',
  KOR: 'KR', IND: 'IN', IDN: 'ID', PHL: 'PH',
};

/**
 * CountryFlag — renders real country flags using bundled SVGs.
 *
 * Uses SVGs from country-flag-icons, rendered via react-native-svg's
 * SvgXml. No network needed, no emoji, works on all devices.
 */
export default function CountryFlag({
  countryCode,
  size = 'medium',
  showName = false,
  className,
  ...viewProps
}: CountryFlagProps) {
  const country = getCountryByCode(countryCode);
  const alpha2 = ALPHA3_TO_ALPHA2[countryCode];
  const svg = alpha2 ? FLAG_SVG[alpha2] : null;

  const flagSize = { small: { w: 24, h: 16 }, medium: { w: 32, h: 22 }, large: { w: 48, h: 32 } }[size];

  if (!country || !svg) {
    return (
      <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
        <View className="w-8 h-5 bg-gray-200 rounded justify-center items-center">
          <Text className="text-[8px] text-gray-500">??</Text>
        </View>
        {showName && (
          <Text className="ml-2 text-sm font-medium text-gray-700">Unknown</Text>
        )}
      </View>
    );
  }

  return (
    <View className={`flex-row items-center ${className || ''}`} {...viewProps}>
      <View
        style={{ width: flagSize.w, height: flagSize.h, borderRadius: 2, overflow: 'hidden', borderWidth: 0.5, borderColor: '#E5E7EB' }}
        accessibilityLabel={`${country.fullName} flag`}
      >
        <SvgXml xml={svg} width={flagSize.w} height={flagSize.h} />
      </View>
      {showName && (
        <Text className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {country.fullName}
        </Text>
      )}
    </View>
  );
}

cssInterop(CountryFlag, { className: true });
