"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfigProvider, Card, Typography, Spin } from "antd";
import { RocketOutlined, ThunderboltOutlined } from "@ant-design/icons";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import { useStrings } from "@/app/_lib/strings";

const { Title, Paragraph } = Typography;

export default function LandingPage() {
  const configProps = useIllustrationTheme();
  const router = useRouter();
  const t = useStrings();

  useEffect(() => {
    // Automatically redirect to the mobile app home screen after 1.5 seconds
    const timer = setTimeout(() => {
      router.push("/home");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ConfigProvider {...configProps}>
      <div className="flex flex-col items-center justify-center bg-white min-h-dvh py-16 px-6 font-sans">
        <main className="w-full max-w-md transition-all duration-300">
          
          <Card 
            title={
              <div className="flex items-center gap-2 font-black uppercase text-sm">
                <ThunderboltOutlined style={{ color: "#FFD93D" }} />
                <span>{t.landing.launching}</span>
              </div>
            }
            bordered={true}
            className="text-center p-6"
          >
            <Title level={2} style={{ margin: "0 0 12px 0", fontWeight: 900 }}>
              Tarn<span className="text-accent-green">ly</span>
            </Title>

            <Paragraph style={{ fontWeight: 600, color: "#2C2C2C" }}>
              {t.landing.loadingApp}
            </Paragraph>

            <div className="py-6 flex items-center justify-center">
              <Spin size="large" />
            </div>

            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              size="large"
              block
              onClick={() => router.push("/home")}
              className="mt-4"
            >
              {t.landing.openApp}
            </Button>
          </Card>

        </main>
      </div>
    </ConfigProvider>
  );
}
