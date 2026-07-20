import React, { useState, useMemo } from 'react';
import { OTSettings, EmployeeRow, EmployeeCategory } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface DesignationsTabProps {
  categories: Record<string, EmployeeCategory>;
  rateTypes: Record<string, 'fixed' | 'dynamic'>;
  employees: EmployeeRow[];
  onChange: (categories: Record<string, EmployeeCategory>, rateTypes: Record<string, 'fixed' | 'dynamic'>) => void;
}

export function DesignationsTab({ categories, rateTypes, employees, onChange }: DesignationsTabProps) {
  const uniqueDesignations = useMemo(() => Array.from(new Set(employees.map(e => e.designation))).sort(), [employees]);
  
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleCategoryChange = (designation: string, category: EmployeeCategory) => {
    onChange(
      { ...categories, [designation]: category },
      rateTypes
    );
  };

  const handleRateTypeChange = (designation: string, rateType: 'fixed' | 'dynamic') => {
    onChange(
      categories,
      { ...rateTypes, [designation]: rateType }
    );
  };

  const handleBulkCategoryChange = (category: EmployeeCategory) => {
    const newCategories = { ...categories };
    selected.forEach(d => {
      newCategories[d] = category;
    });
    onChange(newCategories, rateTypes);
  };

  const handleBulkRateTypeChange = (rateType: 'fixed' | 'dynamic') => {
    const newRateTypes = { ...rateTypes };
    selected.forEach(d => {
      newRateTypes[d] = rateType;
    });
    onChange(categories, newRateTypes);
  };

  const toggleSelectAll = () => {
    if (selected.size === uniqueDesignations.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(uniqueDesignations));
    }
  };

  const toggleSelect = (designation: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(designation)) {
      newSelected.delete(designation);
    } else {
      newSelected.add(designation);
    }
    setSelected(newSelected);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground">Designations</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Assign each designation to Official, Support, or Exempt category. 
          Support staff can receive Fixed rate OT or Dynamic rate (based on basic pay). Official staff always receive Dynamic rate.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            className="w-4 h-4 rounded border-border focus:ring-ring"
            checked={selected.size === uniqueDesignations.length && uniqueDesignations.length > 0}
            onChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">Select all ({selected.size} selected)</span>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative w-fit">
              <Select onValueChange={(val) => handleBulkCategoryChange(val as EmployeeCategory)}>
                <SelectTrigger className="h-8 text-xs">
                  <span className="truncate">Set category</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">Official staff</SelectItem>
                  <SelectItem value="support">Support staff</SelectItem>
                  <SelectItem value="exempt">Exempt (no OT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-fit">
              <Select onValueChange={(val) => handleBulkRateTypeChange(val as 'fixed' | 'dynamic')}>
                <SelectTrigger className="h-8 text-xs">
                  <span className="truncate">Set rate type</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed rate</SelectItem>
                  <SelectItem value="dynamic">Dynamic (basic pay)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-y-auto max-h-[60vh] bg-muted/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10 text-center"></TableHead>
              <TableHead className="font-semibold">Designation</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Rate Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uniqueDesignations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No designations available. Please upload a CSV first.
                </TableCell>
              </TableRow>
            ) : (
              uniqueDesignations.map(designation => {
                const currentCategory = categories[designation] || (designation.toLowerCase().includes('officer') ? 'exempt' : 'official');
                const currentRateType = rateTypes[designation] || (currentCategory === 'support' ? 'fixed' : 'dynamic');
                
                return (
                  <TableRow key={designation} className={selected.has(designation) ? "bg-muted/30" : ""}>
                    <TableCell className="text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-border focus:ring-ring"
                        checked={selected.has(designation)}
                        onChange={() => toggleSelect(designation)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {designation}
                    </TableCell>
                    <TableCell>
                      <div className="relative w-full max-w-[200px]">
                        <Select 
                          value={currentCategory} 
                          onValueChange={(val) => handleCategoryChange(designation, val as EmployeeCategory)}
                        >
                          <SelectTrigger>
                            <span className="truncate">
                              {currentCategory === 'official' && 'Official staff'}
                              {currentCategory === 'support' && 'Support staff'}
                              {currentCategory === 'exempt' && 'Exempt (no OT)'}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="official">Official staff</SelectItem>
                            <SelectItem value="support">Support staff</SelectItem>
                            <SelectItem value="exempt">Exempt (no OT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      {currentCategory === 'support' ? (
                        <div className="relative w-full max-w-[200px]">
                          <Select 
                            value={currentRateType} 
                            onValueChange={(val) => handleRateTypeChange(designation, val as 'fixed' | 'dynamic')}
                          >
                            <SelectTrigger>
                              <span className="truncate">
                                {currentRateType === 'fixed' ? 'Fixed rate' : 'Dynamic (basic pay)'}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed rate</SelectItem>
                              <SelectItem value="dynamic">Dynamic (basic pay)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {currentCategory === 'official' ? 'Dynamic (basic pay)' : 'N/A'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

