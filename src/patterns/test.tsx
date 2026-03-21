export function Test({ string }: { string: string | undefined }) {
  const isString = typeof string === "string";
  if (isString) {
    return <div>{string.length}</div>;
  }
  return <div>Test</div>;
}

// function assertReadonly<T>(value: T): Readonly<T> {
//   return value as Readonly<T>;
// }

// Object の場合は ReadOnly であれば narrowing 可能になった
// const で Object を代入すると narrowing できる

// export const EducationalBackgroundsSection: React.FC<Props> = ({ candidateInfo, loading }) => {
//   const { t } = useI18n(book);
//   const locales = useLocales();
//   const { timeZone } = useTimeZoneContext();

//   const data = assertReadonly(getFragmentData(EDUCATIONAL_BACKGROUNDS_SECTION_FRAGMENT, candidateInfo));
//   // if (!hasNonEmptyArray(data, "educationalBackgrounds")) return null;
//   const educationalBackgrounds = data.educationalBackgrounds;
//   // const hasEducationalBackgrounds = educationalBackgrounds != null;
//   // if(false) {
//   // educationalBackgrounds = null;
//   // }
//   const hasEducationalBackgrounds = educationalBackgrounds != null;

//   return (
//     <div className={cx(flexColumnCss, sectionCss)}>
//       <ATSTypography variant="bodyLBold" component="p" skeleton={loading}>
//         {t("candidates/components/candidateActivities/hiringEventRegistration/educations/label")}
//       </ATSTypography>
//       {hasEducationalBackgrounds &&
//         educationalBackgrounds.map((edu, index) => {
