import Sidebar from '../components/Sidebar';
export default function AtlasLayout({ children }: {
    children: React.ReactNode;
}) {
    return <div className="flex mt-[60px] h-[calc(100dvh-60px)]"><Sidebar /><main className="min-w-0 flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main></div>;
}
