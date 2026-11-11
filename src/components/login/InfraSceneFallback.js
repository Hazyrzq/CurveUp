import Image from 'next/image';

// Static visual used while the 3D scene loads, on tablets / small screens, and without WebGL.
export default function InfraSceneFallback() {
  return (
    <>
      <Image
        src="/images/login_illustration.jpg"
        alt="A construction team reviewing project progress"
        fill
        priority
        sizes="(min-width: 768px) 52vw, 0px"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-legacy-950/30 via-legacy-950/10 to-brand-900/30 mix-blend-multiply" />
    </>
  );
}
