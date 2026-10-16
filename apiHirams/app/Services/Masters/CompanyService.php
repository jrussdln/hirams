<?php

namespace App\Services\Masters;

use App\Events\CompanyUpdated;
use App\Models\Company;
use App\Services\CrudService;

/**
 * Company CRUD + the company-specific logo file cleanup on delete
 * and logo replacement.
 */
class CompanyService extends CrudService
{
    protected string $entityName = 'Company';
    protected string $primaryKey = 'nCompanyId';
    protected array  $searchable = ['strCompanyName', 'strAddress'];
    protected array  $defaultSort = ['strCompanyName', 'asc'];

    protected function modelClass(): string
    {
        return Company::class;
    }

    protected function eventClass(): ?string
    {
        return CompanyUpdated::class;
    }

    /**
     * Deleting a company also removes its logo file from public/logo.
     */
    public function delete(int $id): Company
    {
        $company = $this->find($id);

        // Delete logo file
        if ($company->strLogo) {
            $logoPath = public_path('logo/' . $company->strLogo);

            if (file_exists($logoPath)) {
                unlink($logoPath);
            }
        }

        $company->delete();

        $this->broadcast('deleted', $id);

        return $company;
    }

    /**
     * Replace the company logo file. Matches the previous controller logic
     * exactly and deliberately does NOT broadcast, like before.
     */
    public function uploadLogo(int $id, $file, string $filename): Company
    {
        $company = $this->find($id);

        // Delete the old logo file if it exists
        if ($company->strLogo) {
            $oldPath = public_path('logo/' . $company->strLogo);
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        $file->move(public_path('logo'), $filename);

        $company->update(['strLogo' => $filename]);

        return $company;
    }
}
