const Section: React.FC<{
  title: "About" | "Experience" | "Education" | "Writing" | "Project";
  children: React.ReactNode;
}> = ({ title, children }) => {
  const lower = title.toLocaleLowerCase();
  return (
    <>
      <h2>
        <a id={lower} href={`#${lower}`}>
          {title}
        </a>
      </h2>
      {children}
    </>
  );
};

export default Section;
