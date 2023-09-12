import Section from "@/components/organisms/section/section";
import ProjectCard, {
  type Project,
} from "@/components/atoms/projectCard/projectCard";

const Project: React.FC = async () => {
  return (
    <Section title="Project">
      <ul>
        <li>
          <ProjectCard
            project={{
              title: "momori.dev",
              url: "https://github.com/momori256/momori.dev",
              description:
                "My portfolio site built with Next.js, React, and TyepScript.",
              tags: ["typescript", "next.js", "react"],
            }}
          />
        </li>
        <li>
          <ProjectCard
            project={{
              title: "cs2",
              url: "https://github.com/momori256/cs2",
              description:
                "A HTTP server written in C for Apache HTTP server benchmarking tool.",
              tags: ["c", "network"],
            }}
          />
        </li>
      </ul>
    </Section>
  );
};

export default Project;
