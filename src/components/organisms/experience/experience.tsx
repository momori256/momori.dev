import Section from "@/components/organisms/section/section";
import HistoryCard from "@/components/atoms/historyCard/historyCard";

const Experience: React.FC = () => {
  return (
    <Section title="Experience">
      <ul>
        <li>
          <HistoryCard
            peirod="2020 Apr. - 2023 Jul."
            title="Software Engineer - KOEI TECMO GAMES"
            titleUrl="https://www.gamecity.ne.jp/"
            tags={["c#", "c++", "sql"]}
          >
            <p>
              KOEI TECMO GAMES is a well-known video game company based in
              Japan, renowned for titles such as{" "}
              <a
                target="_blank"
                href="https://www.koeitecmoamerica.com/games/nobunagas-ambition-awakening/"
              >
                Nobunaga&apos;s Ambition
              </a>
              ,{" "}
              <a
                target="_blank"
                href="https://www.koeitecmoamerica.com/nioh/pc/top.html"
              >
                Nioh
              </a>
              , and{" "}
              <a
                target="_blank"
                href="https://www.koeitecmoamerica.com/atelier25th/"
              >
                Atelier
              </a>
              . I developed a version management system for digital assets,
              where my skills in C++, SQL, and C# were fostered. This experience was
              particularly valuable as I was a fresh engineer. Over time, I not
              only contributed to the project but also offered improvement ideas
              and provided support to my team members.
            </p>
          </HistoryCard>
        </li>
      </ul>
    </Section>
  );
};

export default Experience;
