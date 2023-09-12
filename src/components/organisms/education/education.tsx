import styles from "./education.module.scss";

import Section from "@/components/organisms/section/section";
import HistoryCard from "@/components/atoms/historyCard/historyCard";

const Education: React.FC = () => {
  return (
    <Section title="Education">
      <ul className={styles.root}>
        <li>
          <HistoryCard
            peirod="2023 Aug. - Present"
            title="Web Development - Cornerstone International Community College of Canada"
            titleUrl="https://ciccc.ca/"
            tags={["next.js", "react", "typescript"]}
          >
            <p>
              After accumulating three years of professional experience in
              Japan, I relocated to Canada to pursue my enthusiasm for living
              and working internationally. I began a new chapter as a college
              student in Vancouver. This site is my first outcome attained by
              my skills in Web development such as TypeScript, React, and
              Next.js, which I learned in college.
            </p>
          </HistoryCard>
        </li>

        <li>
          <HistoryCard
            peirod="2016 Apr. - 2020 Mar."
            title="Bachelor of Engineering - Waseda University"
            titleUrl="https://www.waseda.jp/top/en/"
            tags={["cs"]}
          >
            <p>
              Waseda University is located in Japan, where I obtained a
              bachelor&apos;s degree in engineering. When I first encountered
              programming, I was immediately attracted to its capacity to embody
              ideas. That is when my journey as an engineer began.
            </p>
          </HistoryCard>
        </li>
      </ul>
    </Section>
  );
};

export default Education;
