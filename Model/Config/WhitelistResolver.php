<?php
/**
 * Copyright (C) 2026 Benjamin Rosenberger <bensch.rosenberger@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @copyright 2026 Benjamin Rosenberger
 * @author bensch.rosenberger@gmail.com
 * @license MIT
 * @link https://brocode.at
 */
declare(strict_types=1);

namespace BroCode\GridFilterSort\Model\Config;

use Magento\Framework\App\Config\ScopeConfigInterface;

/**
 * Reads the opt-in list of grid filters whose options should be sorted.
 *
 * Nothing is sorted unless it is named here. That is deliberate: some filters carry a
 * meaningful non-alphabetical order (order status being the obvious one), and sorting
 * those by default would turn a working grid into a confusing one.
 */
class WhitelistResolver
{
    public const XML_PATH_WHITELIST = 'brocode_grid_filter_sort/general/whitelist';

    /**
     * @var ScopeConfigInterface
     */
    private $scopeConfig;

    public function __construct(ScopeConfigInterface $scopeConfig)
    {
        $this->scopeConfig = $scopeConfig;
    }

    /**
     * Whitelist entries, one per line in config, e.g. "cms_block_listing:store_id".
     *
     * @return string[]
     */
    public function getWhitelist(): array
    {
        $raw = $this->scopeConfig->getValue(self::XML_PATH_WHITELIST);

        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $lines = preg_split('/\r\n|\r|\n/', $raw);

        if ($lines === false) {
            return [];
        }

        $entries = [];

        foreach ($lines as $line) {
            $entry = trim($line);

            // A line without the separator cannot identify a filter, so it is dropped
            // rather than guessed at.
            if ($entry !== '' && strpos($entry, ':') !== false) {
                $entries[$entry] = $entry;
            }
        }

        return array_values($entries);
    }
}
