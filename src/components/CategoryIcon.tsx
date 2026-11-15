import React from "react";
import { Plane, Car, Home, Utensils, ShoppingBag, Tag } from "lucide-react";
import { CategoryType } from "../types";

export const CATEGORY_LIST: CategoryType[] = ["機票", "交通", "住宿", "吃喝", "購物", "其他"];

export const CATEGORY_COLORS: Record<CategoryType, { color: string; bg: string }> = {
  機票: { color: "#557a95", bg: "rgba(85, 122, 149, 0.14)" },
  交通: { color: "#5b8270", bg: "rgba(91, 130, 112, 0.14)" },
  住宿: { color: "#8f6f56", bg: "rgba(143, 111, 86, 0.14)" },
  吃喝: { color: "#a86c72", bg: "rgba(168, 108, 114, 0.14)" },
  購物: { color: "#7c6788", bg: "rgba(124, 103, 136, 0.14)" },
  其他: { color: "#64748b", bg: "rgba(100, 116, 139, 0.14)" },
};

export const CategoryIcon: React.FC<{ category: CategoryType; size?: number }> = ({
  category,
  size = 18,
}) => {
  switch (category) {
    case "機票":
      return <Plane size={size} strokeWidth={2} />;
    case "交通":
      return <Car size={size} strokeWidth={2} />;
    case "住宿":
      return <Home size={size} strokeWidth={2} />;
    case "吃喝":
      return <Utensils size={size} strokeWidth={2} />;
    case "購物":
      return <ShoppingBag size={size} strokeWidth={2} />;
    case "其他":
    default:
      return <Tag size={size} strokeWidth={2} />;
  }
};
