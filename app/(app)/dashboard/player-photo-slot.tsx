import Image from "next/image";

export function PlayerPhotoSlot({
  photoUrl,
  photoOffsetX,
  photoOffsetY,
  studentName,
}: {
  photoUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
  studentName: string;
}) {
  if (photoUrl) {
    return (
      <div className="sd-lobby-athlete-frame">
        {/* Profile photos may be data URLs or Supabase object URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={studentName}
          className="sd-lobby-athlete sd-lobby-athlete-profile"
          style={{
            objectPosition: `${photoOffsetX ?? 50}% ${photoOffsetY ?? 50}%`,
          }}
        />
      </div>
    );
  }

  return (
    <div className="sd-lobby-athlete-frame sd-lobby-athlete-frame-fallback">
      <Image
        src="/images/today-student-cutout.png"
        width={832}
        height={1248}
        alt={`${studentName}, ready to begin`}
        priority
        className="sd-lobby-athlete"
        sizes="(min-width: 1100px) 26vw, 128px"
      />
    </div>
  );
}
