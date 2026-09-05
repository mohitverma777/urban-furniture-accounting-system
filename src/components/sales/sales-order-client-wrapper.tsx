"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { Contact } from "@/db/schema/contacts";
import type { Product } from "@/db/schema/products";
import { SalesOrderDialog } from "./sales-order-dialog";

export interface SalesOrderClientWrapperProps {
  customers: Contact[];
  productsList: Product[];
}

export function SalesOrderClientWrapper({
  customers,
  productsList,
}: SalesOrderClientWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition-colors shadow-md"
      >
        <Plus className="w-4 h-4" />
        <span>New Sales Order</span>
      </button>

      <SalesOrderDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        customers={customers}
        productsList={productsList}
      />
    </>
  );
}
