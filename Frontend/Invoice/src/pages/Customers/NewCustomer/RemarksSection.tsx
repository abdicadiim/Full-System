import React from "react";
import { CustomerFormData } from "./NewCustomer.constants";

type Props = {
  formData: CustomerFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
};

export default function RemarksSection({ formData, handleChange }: Props) {
  return (
    <div className="mt-8">
      <label className="block text-[13px] font-medium text-gray-700 mb-2">
        Remarks <span className="font-normal text-gray-400">(For Internal Use)</span>
      </label>
      <textarea
        name="remarks"
        value={formData.remarks}
        onChange={handleChange}
        className="w-full max-w-3xl px-3 py-2 border border-gray-300 rounded-md text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
        rows={5}
      />
    </div>
  );
}
