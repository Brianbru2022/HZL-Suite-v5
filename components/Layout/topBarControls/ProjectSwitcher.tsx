import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PopoverMenu } from '../../UI/PopoverMenu';

export function ProjectSwitcher({
  projects,
  currentProject,
  canSwitchProjects,
  onSelectProject,
}: {
  projects: any[];
  currentProject?: any;
  canSwitchProjects: boolean;
  onSelectProject?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSelectProject = (id: string) => {
    onSelectProject?.(id);
    setOpen(false);
  };

  return (
    <div className="min-w-0">
      <PopoverMenu
        ariaLabel="Switch project"
        align="left"
        width={256}
        estimatedHeight={320}
        open={open}
        onOpenChange={setOpen}
        menuClassName="workspace-popover-menu rounded-app py-1"
        trigger={({ ref, isOpen, toggle }) => (
          <button
            ref={ref}
            onClick={() => canSwitchProjects && toggle()}
            className="flex max-w-[240px] items-center gap-1.5 truncate text-base font-semibold tracking-tight text-slate-900 hover:text-slate-700 focus:outline-none dark:text-slate-100 dark:hover:text-slate-200"
            aria-haspopup={canSwitchProjects ? 'menu' : undefined}
            aria-expanded={canSwitchProjects ? isOpen : undefined}
            aria-controls={canSwitchProjects ? 'project-switcher-menu' : undefined}
          >
            <span className="truncate">{currentProject?.name ?? 'Project'}</span>
            {canSwitchProjects && <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
          </button>
        )}
      >
        {(close) => (
          <div id="project-switcher-menu">
            {projects.map((project: any) => (
              <button
                key={project.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  handleSelectProject(project.id);
                  close();
                }}
                aria-current={project.id === currentProject?.id ? 'page' : undefined}
                className={`w-full truncate rounded-app-sm px-3 py-2 text-left text-sm font-medium ${
                  project.id === currentProject?.id
                    ? 'bg-slate-100 text-slate-800 dark:bg-slate-800/90 dark:text-slate-100'
                    : 'text-slate-700 hover:bg-surface-muted dark:text-slate-300 dark:hover:bg-slate-700/70'
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}
      </PopoverMenu>
    </div>
  );
}
