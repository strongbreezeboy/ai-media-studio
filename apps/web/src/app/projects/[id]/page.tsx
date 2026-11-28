import { ProjectDetail } from '@/components/project-detail';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <ProjectDetail projectId={id} />
    </div>
  );
}