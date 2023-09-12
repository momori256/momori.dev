import styles from "./home.module.scss";

import Header from "@/components/organisms/header/header";
import About from "@/components/organisms/about/about";
import Experience from "@/components/organisms/experience/experience";
import Education from "@/components/organisms/education/education";
import Writing from "@/components/organisms/writing/writing";
import Project from "@/components/organisms/project/project";

const Home: React.FC = () => {
  return (
    <main className={styles.main}>
      <header>
        <Header />
      </header>

      <section>
        <About />
      </section>

      <section>
        <Experience />
      </section>

      <section>
        <Education />
      </section>

      <section>
        <Writing />
      </section>

      <section>
        <Project />
      </section>
    </main>
  );
};

export default Home;
